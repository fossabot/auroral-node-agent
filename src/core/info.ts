import { gateway } from '../microservices/gateway'
import { wot } from '../microservices/wot'
import { version } from '../../package.json'
import { logger } from '../utils'

export const sendInfoToNM = async function() {
    // Get gtw info
    try {
        const versions = {
            gtw: (await gateway.healthcheck()).message.version,
            wot: (await wot.healthcheck()).message!.version,
            agent: version
        } 
        logger.debug('Sending node info to NM')
        await gateway.sendnodeInfo({ versions })
    } catch (error) {
        logger.error('Error sending node info to NM')
    }
}
