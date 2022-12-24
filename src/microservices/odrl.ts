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
    prefixUrl: '',
    responseType: 'json',
    isStream: false,
    // retry: 0, // Retries on failure N times
    throwHttpErrors: false, // If true 4XX and 5XX throw an error
    timeout: 30000, // 30sec to timeout
    decompress: true // accept-encoding header gzip
})

const ApiHeader = { 
    'Content-Type': 'text/plain',
    simple: 'false' 
}

// INTERFACE

export const odrl = {
    postPolicy: async function(oid: string, pid: string, policy: string): Promise<void> {
        try {
            const response = await request(`${Config.ODRL.HOST}:${Config.ODRL.PORT}/api/policy:${oid}:${pid}`, 'POST', policy, ApiHeader)
        } catch (err) {
            const error = errorHandler(err)
            logger.error('Policy ' + oid + ':' + pid + ' was not registered ...')
            throw new MyError(error.message, error.status)
        }
    },
    deletePolicy: async function(oid: string, pid: string): Promise<void> {
        try {
            const response = await request(`${Config.ODRL.HOST}:${Config.ODRL.PORT}/api/things/policy:${oid}:${pid}`, 'DELETE', undefined, ApiHeader)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Policy ' + oid + ':' + pid + ' was not deleted ...')
            throw new MyError(error.message, error.status)
        }
    },
    validatePolicy: async function(url: string, searchParams?: JsonType<any>): Promise<boolean> {
        try {
            const response = await request(url, 'GET', undefined, ApiHeader, searchParams)
            if (response.statusCode !== HttpStatusCode.OK) {
                return false
            } else {
                return true
            }
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return false
        }
    } 
}

// Private functions

const request = async (endpoint: string, method: Method, body?: string, headers?: Headers, searchParams?: JsonType): Promise<JsonType> => {
    const response = await callApi(endpoint, { method, body, headers, searchParams }) as PlainResponse
    if (response.statusCode >= 500) {
        logger.error(response.statusMessage)
        throw new MyError('Error reaching ODRL server', HttpStatusCode.INTERNAL_SERVER_ERROR)
    }
    if (response.statusCode === 400) {
        logger.error(response.statusMessage)
        throw new MyError('Error storing ODRL or validating payload', HttpStatusCode.BAD_REQUEST)
    }
    if (response.statusCode === 404) {
        logger.error(response.statusMessage)
        throw new MyError('Not found ODRL policy', HttpStatusCode.NOT_FOUND)
    }
    return response as JsonType
}

const buildResponse = (message?: string | JsonType | JsonType[]): BasicResponse<any> => {
    return { message }
}

