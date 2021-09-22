/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 
import got, { Method, Headers, PlainResponse } from 'got'
import { JsonType } from '../types/misc-types'
import { Config } from '../config'
import { logger, errorHandler } from '../utils'
import { BasicResponse } from '../types/wot-types'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.WOT.HOST + ':' + Config.WOT.PORT + '/' + Config.WOT.BASE_URI,
    responseType: 'json',
    isStream: false,
    retry: 2, // Retries on failure N times
    throwHttpErrors: false, // If true 4XX and 5XX throw an error
    timeout: 30000, // 30sec to timeout
    decompress: true // accept-encoding header gzip
})

const ApiHeader = { 
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
    simple: 'false' 
}

// INTERFACE

export const gateway = {
    /**
     * Create/Update a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    upsertTD: async function(oid: string, body: JsonType): Promise<BasicResponse> {
        try {
            const response = await request(`td/${oid}`, 'PUT', undefined, ApiHeader)
            if (response.statusCode === 400) {
                throw new Error('Invalid serialization or TD')
            }
            if (response.statusCode === 404) {
                throw new Error('TD with the given id not found')
            }
            return buildResponse()
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not registered ...')
            throw new Error(error.message)
        }
    },
     /**
     * Create a Thing Description
     * Get oid from WoT
     * THIS IS NOT THE PREFERRED METHOD, USE upsertTD
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    createTD: async function(oid: string, body: JsonType): Promise<BasicResponse> {
        try {
            const response = await request('td', 'POST', undefined, ApiHeader)
            if (response.statusCode === 400) {
                throw new Error('Invalid serialization or TD')
            }
            return buildResponse()
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not registered ...')
            throw new Error(error.message)
        }
    },
    /**
     * Create/Update a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
     updatePartialTD: async function(oid: string, body: JsonType): Promise<BasicResponse> {
        try {
            const response = await request(`td/${oid}`, 'PATCH', undefined, ApiHeader)
            if (response.statusCode === 400) {
                throw new Error('Invalid serialization or TD')
            }
            if (response.statusCode === 404) {
                throw new Error('TD with the given id not found')
            }
            return buildResponse()
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not registered ...')
            throw new Error(error.message)
        }
    },
     /**
     * Delete a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    deleteTD: async function(oid: string): Promise<BasicResponse> {
        try {
            const response = await request(`td/${oid}`, 'DELETE', undefined, ApiHeader)
            if (response.statusCode === 404) {
                throw new Error('TD with the given id not found')
            }
            return buildResponse()
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not deleted ...')
            throw new Error(error.message)
        }
    },
    /**
     * Retrieve a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
     retrieveTD: async function(oid: string): Promise<BasicResponse> {
        try {
            const response = await request(`td/${oid}`, 'GET', undefined, ApiHeader)
            if (response.statusCode === 404) {
                throw new Error('TD with the given id not found')
            }
            return buildResponse(response.body as JsonType)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Problem retrieving TD of object with id ' + oid + '...')
            throw new Error(error.message)
        }
    },
    /**
     * Retrieve a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
        retrieveTDs: async function(): Promise<BasicResponse> {
        try {
            const response = await request('td', 'GET', undefined, ApiHeader)
            return buildResponse(response.body as JsonType)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Error retrieving TDs ...')
            throw new Error(error.message)
        }
    },
    /**
     * Retrieve a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
     searchSPARQL: async function(query: string): Promise<BasicResponse> {
        try {
            const searchParams = (new URLSearchParams([['query', query]])).toString()
            const response = await request('/search/sparql', 'GET', undefined, ApiHeader, searchParams)
            if (response.statusCode === 400) {
                throw new Error('JSONPath expression not provided or contains syntax errors')
            }
            return buildResponse(response.body as JsonType)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Error retrieving TDs ...')
            throw new Error(error.message)
        }
    }
}

// Private functions

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: string): Promise<PlainResponse> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as PlainResponse
    if (response.statusCode >= 500) {
        throw new Error('Error reaching WoT server -- status code 500')
    }
    return response
}

const buildResponse = (message?: string | JsonType | JsonType[]): BasicResponse => {
    return {
        error: false,
        message
    }
}
