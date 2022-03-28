import { CronJob } from 'cron'
import { logger, errorHandler } from '../utils'
import { security } from './security'
import { discovery } from './discovery'
import { reloadConfigInfo } from '../persistance/persistance'
import { Config } from '../config'

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

// Create jobs
const reloadJob = new CronJob('0 0 * * * *', (() => {
    // Running every hour
    logger.info('Running scheduled task: Reloading privacy')
    reloadCloudSettings()
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
