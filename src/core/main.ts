/**
 * agent.js
 * Implements processes available to the main adapter program
 * Can make use of agent support services and interface to gateway
 */

import { Config } from '../config'
import { gateway } from '../microservices/gateway'
import { gtwServices } from './gateway'
import { logger } from '../utils'
import  { loadConfigurationFile, getItem, reloadConfigInfo } from '../persistance/persistance'
import { InteractionsEnum } from '../persistance/models/interactions'
// import { PreRegistration } from '../persistance/models/registrations'
 
 /**
  * Initialization process of the agent module;
  * Loads from memory credentials of registered objects;
  * Performs actions necessary to restart/init agent;
  * @async
  * @returns {boolean}
  */
export const initialize = async function() { 
    logger.info(' ##### Agent startup initiated...')
    // Check current configuration 
    if (!Config.GATEWAY.ID || !Config.GATEWAY.PASSWORD) {
        throw new Error('Missing gateway id or credentials...')
    }
        
    // Get objects OIDs stored locally
    const registrations = await getItem('registrations') as string[]

    // Load mappings and configurations
    await loadConfigurationFile(InteractionsEnum.PROPERTIES)
    await loadConfigurationFile(InteractionsEnum.EVENTS)

    // Login objects
    await gtwServices.doLogins(registrations)

    // Get status of registrations in platform
    const objectsInPlatform = await gateway.getRegistrations()

    // Compare local regitrations with platform registrations
    // TBD: Use more accurate typing
    gtwServices.compareLocalAndRemote(registrations, objectsInPlatform.message as { id: { info: { oid: string } } }[])

    // Initialize WoT
    if (Config.WOT.ENABLED) {
        logger.info('WoT directory successfully started')
    } else {
        logger.warn('WoT directory is not active')
    }

    // Check if chache is active
    if (Config.DB.CACHE) {
        logger.info('Adapter values are being cached with expiration ' + Config.DB.CACHE_TTL + 's')
    } else {
        logger.warn('Adapter values are not being cached by redis')
    }

    // Adapter initialization
    // Initialize event channels
    // for (let i = 0, l = registrations.length; i < l; i++) {
    //     const thing = await getItem('registrations', registrations[i]) as Registration
    //     const events = thing.events || []
    //     if (events.length > 0) {
    //         await gtwServices.activateEventChannels(registrations[i], events)
    //     }
    //  }
    //  logger.info('All event channels created!', 'AGENT')

    // Subscribe event channels
    // await this.subscribeEvents(); Subscription via API

    // Store configuration info
    await reloadConfigInfo()

    // End of initialization
    logger.info(' ##### Agent startup completed!')
    return true
 }
 
 /**
  * Stops gateway connections before killing adapter app;
  * @async
  * @returns {boolean}
  */
 export const stop = async function() {
    // Get objects OIDs stored locally
    const registrations = await getItem('registrations') as string[]
    // Do logouts
    await gtwServices.doLogouts(registrations)
    logger.info('Gateway connections closed', 'AGENT')
    return Promise.resolve(true)
 }
 
//  /**
//   * Register one object;
//   * This function enables adapters to access registration services programatically;
//   * It is a wrapper of the Gateway call for registration, it simplifies the process;
//   * Only requires the body of the new item
//   * @async
//   * @param {object} body
//   * @returns {object} registration response
//   */    
//  export const registerObject = async function(body: PreRegistration | PreRegistration[]) {
//     // TBD: Add to WoT
//     const response = await gtwServices.registerObject(body)
//     return Promise.resolve(response)
//  }
 
//  /**
//   * Unregister one object;
//   * This function enables adapters to access registration services programatically;
//   * It is a wrapper of the Gateway call for unregistration, it simplifies the process;
//   * Only requires the oid of the item to be removed;
//   * @async
//   * @param {String} oid
//   * @returns {object} registration response
//   */    
//  export const unregisterObject = async function(oids: string | string[]) {
//     // TBD: Remove from WoT
//     const obj = typeof oids === 'string' ? { oids: [oids] } : { oids }
//     const response = await gtwServices.removeObject(obj)
//     return Promise.resolve(response)
//  }
