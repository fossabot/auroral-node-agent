/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 
import got, { Method, Headers, PlainResponse } from 'got'
import { JsonType, BasicResponse } from '../types/misc-types'
import { Config } from '../config'
import { logger, errorHandler } from '../utils'
import { Thing } from '../types/wot-types'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.WOT.HOST + ':' + Config.WOT.PORT,
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

export const wot = {
    test: async function(): Promise<BasicResponse<null>> {
        try {
            const response = await request('.well-known/wot-thing-description', 'GET', undefined, ApiHeader)
            if (response.statusCode === 400) {
                throw new Error('Invalid serialization or TD')
            }
            if (response.statusCode === 404) {
                throw new Error('TD with the given id not found')
            }
            logger.debug(response)
            return buildResponse()
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object  was not registered ...')
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
    upsertTD: async function(oid: string, body: JsonType): Promise<BasicResponse<null>> {
        try {
            const response = await request(`api/things/oid:${oid}`, 'PUT', body, ApiHeader)
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
    createTD: async function(oid: string, body: JsonType): Promise<BasicResponse<null>> {
        try {
            const response = await request('api/things/', 'POST', undefined, ApiHeader)
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
     updatePartialTD: async function(oid: string, body: JsonType): Promise<BasicResponse<null>> {
        try {
            const response = await request(`api/things/oid:${oid}`, 'PATCH', undefined, ApiHeader)
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
    deleteTD: async function(oid: string): Promise<BasicResponse<null>> {
        try {
            const response = await request(`api/things/oid:${oid}`, 'DELETE', undefined, ApiHeader)
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
     retrieveTD: async function(oid: string): Promise<BasicResponse<Thing>> {
        try {
            const response = await request(`api/things/oid:${oid}`, 'GET', undefined, ApiHeader)
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
     * Retrieve many Thing Descriptions
     * @async
     * @query {offset,limit,sort_by,sort_order: string}
     * @returns {error: boolean, message: string} 
     */
    retrieveTDs: async function(): Promise<BasicResponse<Thing[]>> {
        try {
            const response = await request('api/things/', 'GET', undefined, ApiHeader)
            return buildResponse(response.body as JsonType)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Error retrieving TDs ...')
            throw new Error(error.message)
        }
    },
    /**
     * Retrieve a Thing Description
     * Provide sparql
     * @async
     * @query {sparql: string}
     * @returns {error: boolean, message: string} 
     */
     searchSPARQL: async function(query: string): Promise<BasicResponse<Thing[]>> {
        try {
            const searchParams = (new URLSearchParams([['query', query]])).toString()
            const response = await request('api/search/sparql', 'GET', undefined, ApiHeader, searchParams)
            if (response.statusCode === 400) {
                throw new Error('SPARQL expression not provided or contains syntax errors')
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

const buildResponse = (message?: string | JsonType | JsonType[]): BasicResponse<any> => {
    return { message }
}
