/**
 * Gateway services
 * Implements support functionality
 */

 import { logger, errorHandler } from '../utils'
 import { gateway } from '../microservices/gateway'
 import { addItem, getItem } from '../persistance/persistance'
 import { RegistrationResultPost } from '../types/gateway-types'
 import { RegistrationBody } from '../persistance/models/registrations'
 import { Config } from '../config'
 
 export const gtwServices = {
     doLogins: async (array: string[]): Promise<void> => {
         try {
             await gateway.login() // Start always the gateway first
             array.forEach(async (it) => {
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
     doLogouts: async (array: string[], stopgtw: boolean = true): Promise<void> => {
         try {
             array.forEach(async (it) => {
                 try {
                     await gateway.logout(it)
                 } catch (err) {
                     const error = errorHandler(err)
                     logger.error('Item ' + it + ' could not be logged out')
                     logger.error(error.message)
                 }
             })
             if (stopgtw) {
                await gateway.logout() // Stop always the gateway last
             }
             logger.info('All logouts were successful')
         } catch (err) {
             const error = errorHandler(err)
             logger.error(error.message)        
 }
     },
     /**
      * Register object in platform
      * Only 1 by 1 - No multiple registration accepted
      */
     registerObject: async (items: RegistrationBody[]): Promise<RegistrationResultPost[]> => {
         if (items.length === 0) {
             return []
         }
         try {
             const itemsForCloud = items.map(it => {
                 const item : RegistrationBody = {
                    name: it.name,
                    type: it.type,
                    adapterId: it.adapterId, 
                    oid: it.oid  
                 }
                 if (it.labels) {
                    item.labels = it.labels
                 }
                 if (it.groups) {
                    item.groups = it.groups
                 }
                 if (it.avatar) {
                    item.avatar = it.avatar
                 }
                 return  item  
             })
             console.log(itemsForCloud)
             const result = await gateway.postRegistrations({
                 agid: Config.GATEWAY.ID,
                 items: itemsForCloud
             })
             if (result.error) {
                 throw new Error('Platform parsing failed, please revise error: ' + JSON.stringify(result.message[0].error))
             }
             result.message.forEach(async (it) => {
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
                     } catch (err) {
                         const error = errorHandler(err)
                         logger.warn(it.name + ' with oid ' + it.oid + ' had a registration issue...')
                         logger.error(error.message)
                     }
                 } else {
                     logger.warn(it.name + ' with oid ' + it.oid + ' could not be registered...')
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
            return result.message
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
