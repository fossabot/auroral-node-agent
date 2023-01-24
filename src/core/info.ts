import fs from 'fs'
import path from 'path'
import { Config } from '../config'
import { gateway } from '../microservices/gateway'
import { wot } from '../microservices/wot'
import { logger } from '../utils'

export const sendInfoToNM = async function() {
    // Get gtw info
    try {
        const agentVersion = JSON.parse(fs.readFileSync(path.join(Config.HOME_PATH, 'package.json')).toString()).version
        const versions = {
            gtw: (await gateway.healthcheck()).message.version,
            wot: (await wot.healthcheck()).message!.version,
            agent: agentVersion
        }
        console.log(versions)
        logger.debug('Sending node info to NM: ' + JSON.stringify(versions))
        await gateway.sendnodeInfo({ versions })
    } catch (error) {
        console.log(error)
        logger.error('Error sending node info to NM')
    }
}
