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
 
 type isLocalController = expressTypes.Controller<{ id: string, originId: string }, string | undefined, {}, void, {}>
 
 export const isLocal = (type: SemanticType) => {
     return function (req, res, next) {
         const { id, originId } = req.params
         const body = req.body
         isRegistered(id)
         .then((local) => { 
             if (local || Config.GATEWAY.ID === id) {
                 logger.debug('Local discovery request')
                 localDiscovery(id, type, body)
                 .then((response) => {
                     return responseBuilder(HttpStatusCode.OK, res, null, response.message)
                 })
                 .catch((err: unknown) => {
                     const error = errorCallback(err)
                     return responseBuilder(error.status, res, error.message)
                 })
             } else {
                 logger.debug('Remote discovery request')
                 return next()
             }
         })
         .catch((err: unknown) => {
             const error = errorCallback(err)
             return responseBuilder(error.status, res, error.message)
         })
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
 
