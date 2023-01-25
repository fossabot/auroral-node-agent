/** 
 * SEMANTIC DISCOVERY
 * Verifies if the destination of the request is local or remote,
 * and if the OID requested belongs to the same node, 
 * the request is not sent to the XMPP network but directly to the adapter
 */

 import { expressTypes } from '../../../types/index'
 import { logger, errorHandler, MyError, responseBuilder, HttpStatusCode } from '../../../utils'
 import { isRegistered } from '../../../persistance/persistance'
 import { wot } from '../../../microservices/wot'
 import { JsonType } from '../../../types/misc-types'
import { Config } from '../../../config'
 
 // Types
 
 enum SemanticType {
    SPARQL = 'Sparql',
    TD = 'TD'
  }
 
 type isLocalController = expressTypes.Controller<{ agid: string }, string | undefined, { query?: string, oids?: string }, any, {}>
 
 export const isLocal = (type: SemanticType) => {
     return async function (req, res, next) {
        const { agid } = req.params
        if (Config.GATEWAY.ID === agid) {
            try {
                 // local
            if (type === SemanticType.SPARQL) {
                logger.debug('Local SPARQL request')
                // SPARQL
                if (!req.query || !req.query.query) {
                    return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing SPARQL')
                }
                const response = (await wot.searchSPARQL(req.query.query)).message
                return responseBuilder(HttpStatusCode.OK, res, null, response)
            } else {
                logger.debug('Local TD request')
                // TD
                if (!req.query || !req.query.oids) {
                    return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing oids')
                }
                const TDs = await Promise.all(req.query.oids.split(',').map(async (oid: string) => {
                    try {
                        return { oid, success: true, td: (await wot.retrieveTD(oid)).message }
                    } catch (err) {
                        return { oid, success: false }
                    }
                }))
                return responseBuilder(HttpStatusCode.OK, res, null, TDs)
            }
            } catch (err) {
                const error = errorCallback(err)
                return responseBuilder(error.status, res, error.message)
            }
        } else {
            // remote
            return next()
       }
     } as isLocalController
 } 
 
 // Private
 
 const localDiscovery = async (oid: string, type: SemanticType, body?: string): Promise<JsonType> => {
     if (type === SemanticType.TD) {
        return wot.retrieveTD(oid) 
     } else {
         if (body) {
            return wot.searchSPARQL(body)
         } else {
            throw new MyError('Missing SPARQL in body', HttpStatusCode.BAD_REQUEST)
         }
     }
 }
 
 const errorCallback = (err: unknown) => {
     const error = errorHandler(err)
     logger.error(error.message)
     return error
 }
 
