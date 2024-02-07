import { CronJob } from 'cron'
import { logger, errorHandler } from '../utils'
import { security } from './security'
import { discovery } from './collaboration'
import { reloadConfigInfo } from '../persistance/persistance'
import { Config } from '../config'
import { gateway } from '../microservices/gateway'

// Private functions 
const reloadCloudSettings = async (): Promise<void> => {
    try {
        // Get my organisation info
        await security.cacheItemsPrivacy()
        const cid = await discovery.reloadCid(Config.GATEWAY.ID)
        const partners = await discovery.reloadPartners()
        const info = await discovery.reloadPartnerInfo(cid)
        // Store configuration info
        await reloadConfigInfo(cid, info.name, info.nodes, partners)
    } catch (err) {
        const error = errorHandler(err)
        logger.error('Could refresh privacy and partners')
        logger.error(error.message)
    }
}
const reloginEverything = async (): Promise<void> => {
    try{
        logger.info("Replogging job started")
        // relogin GTW
        logger.debug('Relogin GTW')
        await gateway.logout()
        await gateway.login()
        logger.debug('Relogin GTW done')
        // relogin ITEMS
        logger.debug('Relogin ITEMS')
        const oids = (await gateway.getRegistrations()).message
        for (const oid of oids) {
            logger.debug('Relogin ' + oid)
            await gateway.logout(oid)
            await gateway.login(oid)
        }
        logger.debug('Relogin ITEMS done')
    } catch (err) {
        const error = errorHandler(err)
        logger.error('Could not relogin')
        logger.error(error.message)
    }
}

// Create jobs
const reloadJob = new CronJob('0 0 * * * *', (() => {
    // Running every hour
    logger.info('Running scheduled task: Reloading privacy')
    reloadCloudSettings()
}), null, true)
const reloginJob = new CronJob('3 * * * *', (() => {
    // Running every day
    logger.info('Running scheduled task: Relogin')
    reloginEverything()
}), null, true)

// Export scheduler
export const scheduledJobs = {
    start: () => {
        reloadJob.start()
    },
    stop: () => {
        reloadJob.stop()
    }
}
