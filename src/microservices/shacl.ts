/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 
import got, { Method, Headers, PlainResponse } from 'got'
import { JsonType } from '../types/misc-types'
import { logger, errorHandler, MyError, HttpStatusCode } from '../utils'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: 'http://shacl:4567/',
    responseType: 'json',
    isStream: false,
    // retry: 0, // Retries on failure N times
    throwHttpErrors: false, // If true 4XX and 5XX throw an error
    timeout: 30000, // 30sec to timeout
    decompress: true // accept-encoding header gzip
})

const ApiHeader = { 
    'Content-Type': 'application/json',
    simple: 'false' 
}

// INTERFACE

export const shacl = {
    validateMessage: async function(context: string, body: any): Promise<void> {
        try {
            const response = await request(`api/${context}?format=json-ld 1.1`, 'POST', JSON.stringify(body), ApiHeader)
            console.log(response.body)
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },
    healthCheck: async function(): Promise<boolean> {
        try {
            const response = await request('api', 'GET', undefined, ApiHeader)
            // console.log(response)
            if (response.statusCode !== HttpStatusCode.OK) {
                return false
            }
            return true
        } catch  {
            return false
        }
    },
    postShape: async function(id: string, shape: string): Promise<void> {
        try {
            const response = await request(`api/${id}`, 'PUT', shape, ApiHeader)
        } catch (err) {
            const error = errorHandler(err)
            logger.debug('Shape ' + id + ' was not registered ...')
            logger.error(error.message)
        }
    },
    getShape: async function(id: string): Promise<string> {
        try {
            return request(`api/${id}`, 'GET', undefined, ApiHeader) as unknown as string
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    }
}

// Private functions

const request = async (endpoint: string, method: Method, body?: string, headers?: Headers, searchParams?: JsonType): Promise<JsonType> => {
    const response = await callApi(endpoint, { method, body, headers, searchParams }) as PlainResponse
    if (response.statusCode >= 500) {
        logger.error(response.statusMessage)
        throw new MyError('Error reaching SHACL server', HttpStatusCode.INTERNAL_SERVER_ERROR)
    }
    if (response.statusCode === 400) {
        logger.error(response.statusMessage)
        throw new MyError('Error validating payload', HttpStatusCode.BAD_REQUEST)
    }
    return response as JsonType
}

