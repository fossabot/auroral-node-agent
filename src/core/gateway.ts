/**
 * Gateway services
 * Implements support functionality
 */

 import { logger, errorHandler, MyError, HttpStatusCode } from '../utils'
 import { gateway } from '../microservices/gateway'
 import { addItem,  getItem, updateItem } from '../persistance/persistance'
 import { RegistrationResultPost, RegistrationUpdateResult } from '../types/gateway-types'
 import { RegistrationBody, RegistrationnUpdateNm, RegistrationnUpdateRedis, RegistrationUpdate } from '../persistance/models/registrations'
 import { Config } from '../config'
import { RegistrationError } from '../types/misc-types'
 
// Types

type RegistrationRet = {
    registrations: RegistrationResultPost[],
    errors: RegistrationResultPost[]
}

 export const gtwServices = {
     doLogins: async (array: string[] | null): Promise<void> => {
         try {
            const items: string[] = array ? array : await getItem('registrations') as string[]
             await gateway.login() // Start always the gateway first
             items.forEach(async (it) => {
                 try {
                     await gateway.login(it)
                 } catch (err) {
                     const error = errorHandler(err)
                     logger.error('Item ' + it + ' could not be logged in')
                     logger.error(error.message)
                 }
             })
         } catch (err) {
             const error = errorHandler(err)
             logger.error(error.message)
         }
     },
     doLogouts: async (array: string[] | null, stopgtw: boolean = true): Promise<void> => {
        const items: string[] = array ? array : await getItem('registrations') as string[]
        items.forEach(async (it) => {
            try {
                await gateway.logout(it)
            } catch (err) {
                const error = errorHandler(err)
                logger.error('Item ' + it + ' could not be logged out')
                logger.error(error.message)
            }
        })
        if (stopgtw) {
            logger.info('Logging out Node instance...')
            await gateway.logout() // Stop always the gateway last
        }
     },
     /**
      * Register object in platform
      * Only 1 by 1 - No multiple registration accepted
      */
     registerObject: async (items: RegistrationBody[]): Promise<RegistrationRet> => {
         try {
             const itemsForCloud = _buildItemsForCloud(items)
             // Register in cloud
             const result = await gateway.postRegistrations({
                 agid: Config.GATEWAY.ID,
                 items: itemsForCloud
             })
             // Cloud returns global error
             if (result.error) {
                 throw new MyError('Registration failed in Cloud: ' + JSON.stringify(result.message[0].error), HttpStatusCode.BAD_REQUEST)
             }
             // Register items locally
             const registrations: RegistrationResultPost[] = []
             const errors: RegistrationResultPost[] = []
             for (let i = 0, l = result.message.length; i < l; i++) {
                 const it = result.message[i]
                 if (!it.error && it.password) {
                    try {
                        const td = items.filter(x => x.oid === it.oid)
                        await addItem('registrations', 
                            { 
                                ...td[0], 
                                oid: it.oid,
                                password: it.password,
                                created: new Date().toISOString(),
                                credentials: 'Basic ' + Buffer.from(it.oid + ':' + it.password, 'utf-8').toString('base64')
                            })
                        logger.info(it.name + ' with oid ' + it.oid + ' successfully registered!')
                        registrations.push(it)
                    } catch (err) {
                        const error = errorHandler(err)
                        logger.warn(it.name + ' with oid ' + it.oid + ' had a registration issue...')
                        logger.error(error.message)
                        errors.push({ oid: it.oid, name: it.name, password: null, error: 'Error storing in REDIS' })
                        // If REDIS registration fails remove it from cloud
                        await _revertCloudRegistration(it.oid)
                    }
                } else {
                    logger.warn(it.name + ' with oid ' + it.oid + ' could not be registered...')
                    errors.push({ oid: it.oid, name: it.name, password: null, error: 'Error registering in cloud' })
                }
             }
             // Do login of infrastructure with small delay to avoid race conditions
            setTimeout(
                async () => {
                    // Get objects OIDs stored locally
                    const oids = await getItem('registrations') as string[]
                    gtwServices.doLogins(oids)
                }, 
                5000)
            // Return and end registration
            return { registrations, errors }
         } catch (err) {
             const error = errorHandler(err)
             throw new Error(error.message)
         }
     },
     updateObject: async (items: RegistrationUpdate[]): Promise<RegistrationUpdateResult> => {
        if (!items) {
            throw new Error('any items to update')
        }
        try {
            const nmItems = _filterNmProperties(items)
            const result = await gateway.updateRegistration({
                agid: Config.GATEWAY.ID,
                items: nmItems
            })
            if (result.error) {
                throw new Error('Platform parsing failed, please revise error: ' + JSON.stringify(result.message[0].error))
            }
            result.message.forEach(async (it) => {
                if (!it.error) {
                    try {
                        const itemUpdate = items.filter(x => x.oid === it.oid)[0]
                        const redistItem = _filterRedisProperties(itemUpdate) 
                        // Update redis DB
                        await updateItem(redistItem)
                        logger.info(it.oid + ' successfully updated!')
                    } catch (err) {
                        const error = errorHandler(err)
                        logger.warn(it.oid + ' had a updating issue...')
                        logger.error(error.message)
                    }
                } else {
                    logger.warn(it.oid + ' could not be updated...')
                }
            })
            // Do login of infrastructure with small delay to avoid race conditions
           setTimeout(
               async () => {
                   // Get objects OIDs stored locally
                   const registrations = await getItem('registrations') as string[]
                   gtwServices.doLogins(registrations)
               }, 
               5000)
           // Return and end registration
           return { error: false, message: result.message }
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },
     /**
      * Compare Local infrastracture with platform
      * Both should have the same objects registered
      */
     compareLocalAndRemote: (local: string[], platform: string[]) => {
         try {
             for (let i = 0, l = local.length; i < l; i++) {
                 if (platform.indexOf(local[i]) === -1) {
                     throw new Error('Local and platform objects are not the same')
                 }
             }
             logger.info('Local and platform objects match!')
             return true
         } catch (err) {
             const error = errorHandler(err)
             logger.warn(error.message)
             return false
        }
    }
}
    
//  Private functions

    const _filterRedisProperties = (item: RegistrationUpdate): RegistrationnUpdateRedis => {
        if (!item.oid) {
            throw new Error('Item does not have oid')
        }
        const itemRedis: RegistrationnUpdateRedis = {
            oid: item.oid,
            name: item.name,
            adapterId: item.adapterId,
            properties: item.properties ? item.properties.toString() : undefined,
            actions: item.actions ? item.actions.toString() : undefined,
            events: item.events ? item.events.toString() : undefined
        }
        return itemRedis
    }

    const _filterNmProperties = (items: RegistrationUpdate[]): RegistrationnUpdateNm[] => {
        const nmItems: RegistrationnUpdateNm[] = []
        items.forEach(item => {
            if (!item.oid) {
                throw new Error('Item does not have oid')
            }
            const itemNm: RegistrationnUpdateNm = {
                oid: item.oid,
                name: item.name,
                adapterId: item.adapterId,
                labels: item.labels,
                avatar: item.avatar,
                groups: item.groups !== undefined ? [...item.groups] : undefined,
                version: item.version,
                description: item.description,
            }
            nmItems.push(itemNm)
        })
        return nmItems
    }

    const _buildItemsForCloud = (items: RegistrationBody[]) => {
        return items.map(it => {
            const item : RegistrationBody = {
               name: it.name,
               type: it.type,
               adapterId: it.adapterId, 
               oid: it.oid,
               labels: it.labels ? it.labels : undefined,
               groups: it.groups ? it.groups : undefined,
               avatar: it.avatar ? it.avatar : undefined
            }
            return item  
        })
    }

    const _revertCloudRegistration = async (oid: string) => {
        try {
            await gateway.removeRegistrations({ oids: [oid] })
        } catch (err) {
            const error = errorHandler(err)
            logger.error('Attempt to revert cloud registration failed ' + oid)
            logger.error(error.message)
        }
    }
