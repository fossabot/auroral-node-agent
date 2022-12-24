import { logger, errorHandler, HttpStatusCode, MyError } from '../utils'
import { wot } from '../microservices/wot'
import { Config } from '../config'
import { odrl } from '../microservices/odrl'
import { JsonType } from '../types/misc-types'

export const createOdrlPolicy = async (oid: string, pid: string, policy: string) : Promise<void> => {
    try {
        logger.debug(`Creating ODRL policy for ${oid} ${pid}`)
        if (!Config.ODRL.ENABLED) {
          throw new MyError('ODRL is not enabled', HttpStatusCode.BAD_REQUEST)
        }
        if (!oid || !pid) {
          throw new MyError('Missing oid or pid', HttpStatusCode.BAD_REQUEST)
        }
        // TBD: Check if OID/PID exists
        // POST policy to ODRL manager
        await odrl.postPolicy(oid, pid, policy)
        // Update policy in TD
        try {
            logger.debug('Retrieving TD from wot')
            const td = await wot.retrieveTD(oid)
            if (td.error || !td.message) {
                throw new MyError('TD not found in WotHive', HttpStatusCode.BAD_REQUEST)
            }
            if (!td.message.properties || !td.message.properties[pid]) {
                throw new MyError('Property not found in TD', HttpStatusCode.BAD_REQUEST)
            }
            // Check if forms is defiend in TD
            if (!td.message.properties[pid].forms || td.message.properties[pid].forms!.length === 0) {
                throw new MyError('Object Property has no forms', HttpStatusCode.BAD_REQUEST)
            }
            // add policy
            td.message.properties[pid].forms![0].odrl = `${Config.ODRL.HOST}:${Config.ODRL.PORT}/api/policySolver/data?name=policy:${oid}:${pid}`
            // send to WoT
            await wot.upsertTD(oid, td.message)
            return
        } catch (err) {
          // Error in WoT -> delete policy from ODRL and return error
            const error = errorHandler(err)
            await odrl.deletePolicy(oid, pid)
            throw new MyError(error.message, error.status)
        }
      } catch (err) {
          const error = errorHandler(err)
        //   logger.error(error.message)
          throw new MyError(error.message, error.status)
      }
}

export const checkODRLPolicy = async (oid: string, pid: string, queryParams?: JsonType) : Promise<void> => {
    try {
        if (!Config.ODRL.ENABLED) {
            // ODRL is not enabled
            return
        }
        // ODRL is enabled
        logger.debug('ODRL enabled -> checking policy')
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
            throw new MyError('Object Property has no forms', HttpStatusCode.BAD_REQUEST)
        }
        // Check if odrl is defined in TD
        if (!td.properties[pid].forms![0].odrl) {
            logger.debug('Object Property has no ODRL')
            return
        }
        // check policy in ODRL
        const url = new URL(td.properties[pid].forms![0].odrl!)
        // Merging query params
        if (queryParams) {
            Object.entries(queryParams).forEach(([key, value]) => {
                url.searchParams.set(key, value)
            })
        }
        // Creating query params object for GOT
        const searchParams = {} as any
        url.searchParams.forEach((value: string, key: string) => {
            searchParams[key] = value
        })
        const href: string = url.origin + url.pathname
        const success = await odrl.validatePolicy(href, searchParams)
        if (!success) {
            throw new MyError('ODRL policy not satisfied', HttpStatusCode.FORBIDDEN)
        }
        logger.info('ODRL policy validated and accepted!!')
        return 
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        throw new MyError(error.message, error.status)
    }
}
