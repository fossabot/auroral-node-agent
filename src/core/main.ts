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
import { security } from './security'
import { discovery } from './collaboration'
import { scheduledJobs } from './scheduler'
 
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

    logger.info('--- There are ' + registrations.length + ' item(s) in your infrastructure')

    // Login objects
    await gtwServices.doLogins(registrations)

    // Get status of registrations in platform
    const objectsInPlatform = (await gateway.getRegistrations()).message

    // Compare local regitrations with platform registrations
    gtwServices.compareLocalAndRemote(registrations, objectsInPlatform)

    // Initialize WoT
    if (Config.WOT.ENABLED) {
        logger.info('--- WoT directory successfully started')
        // await wot.test()
    } else {
        logger.warn('--- WoT directory is not active')
    }

    // Check if chache is active
    if (Config.DB.CACHE) {
        logger.info('--- Adapter values are being cached with expiration ' + Config.DB.CACHE_TTL + 's')
    } else {
        logger.warn('--- Adapter values are not being cached by redis')
    }

    // Update Items privacy in node
    await security.cacheItemsPrivacy()
    logger.info('--- Local items privacy updated!!')

    // Check Adapter mode
    logger.info('--- Agent is responding to incoming requests in ' + Config.ADAPTER.MODE + ' mode')

    // Get my organisation info
    const cid = await discovery.reloadCid(Config.GATEWAY.ID)
    const info = await discovery.reloadPartnerInfo(cid)
    const partners = await discovery.reloadPartners()
    logger.info('--- Node belongs to organisation: ' + info.name)

    // Store configuration info
    await reloadConfigInfo(cid, info.name, info.nodes, partners)

    // Scheduled tasks
    scheduledJobs.start()

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
