/**
 * agent.js
 * Implements processes available to the main adapter program
 * Can make use of agent support services and interface to gateway
 */

import { Config } from '../config'
import { gateway } from '../microservices/gateway'
import { gtwServices } from './gateway'
import { logger } from '../utils'
import  { getItem, reloadConfigInfo } from '../persistance/persistance'
import { wot } from '../microservices/wot'
 
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
        // await wot.test()
    } else {
        logger.warn('WoT directory is not active')
    }

    // Check if chache is active
    if (Config.DB.CACHE) {
        logger.info('Adapter values are being cached with expiration ' + Config.DB.CACHE_TTL + 's')
    } else {
        logger.warn('Adapter values are not being cached by redis')
    }

    // Store configuration info
    await reloadConfigInfo()

    // Scheduled tasks
    // Run periodic healthchecks
    // Re-login the infrastructure periodically (i.e 60min)
    // Others ...

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
