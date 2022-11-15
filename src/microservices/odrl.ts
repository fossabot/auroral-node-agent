/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 
import got, { Method, Headers, PlainResponse } from 'got'
import { JsonType, BasicResponse } from '../types/misc-types'
import { Config } from '../config'
import { logger, errorHandler, MyError, HttpStatusCode } from '../utils'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.ODRL.HOST + ':' + Config.ODRL.PORT,
    responseType: 'json',
    isStream: false,
    retry: 2, // Retries on failure N times
    throwHttpErrors: false, // If true 4XX and 5XX throw an error
    timeout: 30000, // 30sec to timeout
    decompress: true // accept-encoding header gzip
})

const ApiHeader = { 
    'Content-Type': 'application/td+json',
    simple: 'false' 
}

// INTERFACE

export const odrl = {
    postPolicy: async function(oid: string, pid: string, policy: string): Promise<void> {
        try {
            const response = await request(`api/policy:${oid}:${pid}`, 'POST', policy, ApiHeader)
        } catch (err) {
            const error = errorHandler(err)
            logger.error('Object ' + oid + ' was not registered ...')
            throw new MyError(error.message, error.status)
        }
    },
    deletePolicy: async function(oid: string, pid: string): Promise<BasicResponse<null>> {
        throw new MyError('Not implemented', HttpStatusCode.NOT_IMPLEMENTED)
        // try {
        //     const response = await request(`api/things/policy:${oid}:${pid}`, 'DELETE', undefined, ApiHeader)
        //     return buildResponse(response)
        // } catch (err) {
        //     const error = errorHandler(err)
        //     logger.warn('Object ' + oid + ' was not registered ...')
        //     throw new MyError(error.message, error.status)
        // }
    }
}

// Private functions

const request = async (endpoint: string, method: Method, json?: String, headers?: Headers, searchParams?: JsonType): Promise<JsonType> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as PlainResponse
    if (response.statusCode >= 500) {
        throw new MyError('Error reaching ODRL server', HttpStatusCode.INTERNAL_SERVER_ERROR)
    }
    if (response.statusCode === 400) {
        throw new MyError('Error storing ODRL', HttpStatusCode.BAD_REQUEST)
    }
    if (response.statusCode === 404) {
        throw new MyError('Error storing ODRL', HttpStatusCode.NOT_FOUND)
    }
    return response.body as JsonType
}

const buildResponse = (message?: string | JsonType | JsonType[]): BasicResponse<any> => {
    return { message }
}

