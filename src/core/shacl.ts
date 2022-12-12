import got from 'got'
import { logger, errorHandler, HttpStatusCode, MyError } from '../utils'
import { wot } from '../microservices/wot'
import { Config } from '../config'

export const checkSHACL = async (oid: string, pid: string, data: any) : Promise<void> => {
    try {
        if (!Config.SHACL.ENABLED) {
            // SHACL is not enabled
            return
        }
        // SHACL is enabled
        logger.debug('SHACL enabled -> checking response')
        // retrieve url from WoT
        const td = (await wot.retrieveTD(oid)).message
        if (!td) {
            throw new MyError('TD not found in WotHive', HttpStatusCode.BAD_REQUEST)
        }
        if (!td.properties || !td.properties[pid]) {
            throw new MyError('Property not found in TD', HttpStatusCode.BAD_REQUEST)
        }
        // Check if forms is defiend in TD
        if (!td.properties[pid].forms || td.properties[pid].forms!.length === 0) {
            logger.debug('Object Property has no forms')
            return
        }
        // Check if odrl is defined in TD
        if (!td.properties[pid].forms![0].shacl) {
            logger.debug('Object Property has no shacl url')
            return
        }
        // check policy in ODRL
        const response = await got.post(td.properties[pid].forms![0].shacl!, { body: data })
        if (response.statusCode !== HttpStatusCode.OK) {
            throw new MyError('SHACL not satisfied', HttpStatusCode.BAD_REQUEST)
        }
        return 
    } catch (err) {
        const error = errorHandler(err)
        logger.error('SHACL validation error: ' + error.message)
    }
}
