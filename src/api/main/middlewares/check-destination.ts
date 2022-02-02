/** 
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

export enum Method {
    POST = 'POST',
    GET = 'GET',
    PUT = 'PUT'
}

type checkDestinationController = expressTypes.Controller<{ id: string, oid: string, pid: string }, JsonType, {}, void, {}>

export const checkDestination = (method: Method) => {
    return function (req, res, next) {
        const { id, oid, pid } = req.params
        const body = req.body
        isRegistered(oid)
        .then((local) => { 
            if (local) {
                logger.debug('Local consumption request')
                getLocalData(oid, pid, body, method)
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

const getLocalData = async (oid: string, pid: string, body: JsonType, method: Method): Promise<JsonType> => {
    if (method === Method.GET) {
       return Data.readProperty(oid, pid) 
    } else {
        return Data.updateProperty(oid, pid, body)
    }
}

const errorCallback = (err: unknown) => {
    const error = errorHandler(err)
    logger.error(error.message)
    return error.message
}
