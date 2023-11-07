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
    responseType: 'text',
    isStream: false,
    // retry: 0, // Retries on failure N times
    throwHttpErrors: false, // If true 4XX and 5XX throw an error
    timeout: 10000, // 10sec to timeout
    decompress: true // accept-encoding header gzip
})

const ApiHeader = { 
    'Content-Type': 'application/json',
    simple: 'false' 
}

// INTERFACE

export const shacl = {
    validateMessage: async function(context: string, body: any): Promise<boolean> {
        try {
            const response = await request(`api/${context}?format=json-ld 1.1`, 'POST', JSON.stringify(body), ApiHeader)
            if(response.statusCode === HttpStatusCode.OK) {
                // extract response from body
                // look for sh:conforms true
                const regex = 'sh:conforms +true'
                const result = response.body.match(regex) == null ? false : true
                return result
            } else {
                return false
            }
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },
    healthCheck: async function(): Promise<boolean> {
        try {
            // const response = await request('api', 'GET', undefined, ApiHeader)
            const response = await got('http://shacl:4567/api', { method: 'GET', headers: ApiHeader, timeout: 1000})
            if (response.statusCode !== HttpStatusCode.OK) {
                logger.debug('SHACL is not reachable')
                return false
            }
            return true
        } catch  {
            logger.debug('SHACL is not reachable')
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
            const response = await request(`api/${id}`, 'GET', undefined, ApiHeader) as unknown as string
            logger.debug('Shape ' + id + ' found ...')
            return response
        } catch (err) {
            logger.debug('Shape ' + id + ' was not found ...')
            const error = errorHandler(err)
            logger.error(error.message)
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

