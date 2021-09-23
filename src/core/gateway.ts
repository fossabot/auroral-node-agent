/**
 * Gateway services
 * Implements support functionality
 */

 import { logger, errorHandler } from '../utils'
 import { gateway } from '../microservices/gateway'
 import { addItem, removeItem, getItem } from '../persistance/persistance'
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
     doLogouts: async (array: string[]): Promise<void> => {
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
             await gateway.logout() // Stop always the gateway last
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
         try {
             const result = await gateway.postRegistrations({
                 agid: Config.GATEWAY.ID,
                 items
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
     * Remove object from platform
     */
     removeObject: async (body: { oids: string[] }) => {
         try {
             const wrapper = {
                 agid: Config.GATEWAY.ID,
                 oids: body.oids
             }
             const result = await gateway.removeRegistrations(wrapper)
             await removeItem('registrations', body.oids)
             logger.info(result)
             return Promise.resolve('Successful deregistration')
         } catch (err) {
             return Promise.reject(err)
         }
     },
     /**
      * Compare Local infrastracture with platform
      * Both should have the same objects registered
      */
     compareLocalAndRemote: (local: string[], platform: { id: { info: { oid: string } } }[]) => {
         try {
             const oidArray = platform.map((item) => {
                 return item.id.info.oid 
             })
             for (let i = 0, l = local.length; i < l; i++) {
                 if (oidArray.indexOf(local[i]) === -1) {
                     throw new Error('Local and platform objects are not the same')
                 }
             }
             logger.info('Local and platform objects match!')
             return true
         } catch (err) {
             const error = errorHandler(err)
             logger.warn('Local and remote registrations do not match')
             logger.warn(error.message)
             return false
         }
     }
    }
