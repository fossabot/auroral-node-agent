import { CronJob } from 'cron'
import { logger, errorHandler } from '../utils'
import { security } from './security'

// Private functions 
const reloadPrivacy = async (): Promise<void> => {
    try {
        await security.cacheItemsPrivacy()
    } catch (err) {
        const error = errorHandler(err)
        logger.error('Could not load privacy')
        logger.error(error.message)
    }
}

// Create jobs
const privacyJob = new CronJob('0 0 * * * *', (() => {
    // Running every hour
    logger.info('Running scheduled task: Reloading privacy')
    reloadPrivacy()
}), null, true)

// Export scheduler
export const scheduledJobs = {
    start: () => {
        privacyJob.start()
    },
    stop: () => {
        privacyJob.stop()
    }
}
