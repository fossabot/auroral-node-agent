/** 
 * CONSUMPTION REQUESTS
 * Verifies if the destination of the request is local or remote,
 * and if the OID requested belongs to the same node, 
 * the request is not sent to the XMPP network but directly to the adapter
 */

import { expressTypes } from '../../../types/index'
import { logger, errorHandler, responseBuilder, HttpStatusCode } from '../../../utils'
import { isRegistered } from '../../../persistance/persistance'
import { Data } from '../../../core/data'
import { JsonType } from '../../../types/misc-types'

// Types

enum Method {
    POST = 'POST',
    GET = 'GET',
    PUT = 'PUT'
}

type checkDestinationController = expressTypes.Controller<{ id: string, oid: string, pid: string }, JsonType, JsonType, void, {}>

export const checkDestination = (method: Method) => {
    return function (req, res, next) {
        const { oid, pid, id } = req.params
        const body = req.body
        const reqParams = req.query
        isRegistered(oid)
        .then((local) => { 
            if (local) {
                logger.debug('Local consumption request')
                getLocalData(oid, pid, id, body, method, reqParams)
                .then((response) => {
                    return responseBuilder(HttpStatusCode.OK, res, null, response)
                })
                .catch((err: unknown) => {
                    const message = errorCallback(err)
                    return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, message)
                })
            } else {
                logger.debug('Remote consumption request')
                return next()
            }
        })
        .catch((err: unknown) => {
            const message = errorCallback(err)
            return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, message)
        })
    } as checkDestinationController
} 

// Private

const getLocalData = async (oid: string, pid: string, sourceoid: string, body: JsonType, method: Method, reqParams: JsonType): Promise<JsonType> => {
    if (method === Method.GET) {
       return Data.readProperty(oid, pid, sourceoid, reqParams) 
    } else {
        return Data.updateProperty(oid, pid, sourceoid, body, reqParams)
    }
}

const errorCallback = (err: unknown) => {
    const error = errorHandler(err)
    logger.error(error.message)
    return error.message
}
