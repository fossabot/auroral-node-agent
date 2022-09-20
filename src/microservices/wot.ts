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

const callSPARQL = got.extend({
    prefixUrl: Config.WOT.HOST + ':' + Config.WOT.PORT,
    responseType: 'text',
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

const SparqlHeader = {
    'Content-Type': 'text/plain'
}

// INTERFACE

export const wot = {
    /**
     * Create/Update a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    upsertTD: async function(oid: string, body: JsonType): Promise<BasicResponse<null>> {
        try {
            const response = await request(`api/things/${oid}`, 'PUT', body, ApiHeader)
            return buildResponse(response)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not registered ...')
            throw new MyError(error.message, error.status)
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
    createTD: async function(oid: string, _body: JsonType): Promise<BasicResponse<null>> {
        try {
            const response = await request('api/things/', 'POST', undefined, ApiHeader)
            return buildResponse(response)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not registered ...')
            throw new MyError(error.message, error.status)
        }
    },
    /**
     * Create/Update a Thing Description
     * Provide oid
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
     updatePartialTD: async function(oid: string, _body: JsonType): Promise<BasicResponse<null>> {
        try {
            const response = await request(`api/things/${oid}`, 'PATCH', undefined, ApiHeader)
            return buildResponse(response)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not registered ...')
            throw new MyError(error.message, error.status)
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
            const response = await request(`api/things/${oid}`, 'DELETE', undefined, ApiHeader)
            return buildResponse(response)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not deleted ...')
            throw new MyError(error.message, error.status)
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
            const response = await request(`api/things/${oid}`, 'GET', undefined, ApiHeader)
            return buildResponse(response)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Problem retrieving TD of object with id ' + oid + ':' + error.message)
            throw new MyError(error.message, error.status)
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
            return buildResponse(response)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Error retrieving TDs ...')
            throw new MyError(error.message, error.status)
        }
    },
    /**
     * Retrieve a Thing Description
     * Provide sparql
     * @async
     * @query {sparql: string}
     * @returns {error: boolean, message: string} 
     */
     searchSPARQL: async function(query: string): Promise<BasicResponse<JsonType>> {
        try {
            const response = await requestSPARQL('api/search/sparql', 'POST', query, SparqlHeader)
            return buildResponse(response)
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Error processing SPARQL query ...')
            throw new MyError(error.message, error.status)
        }
    },
    searchFederativeSPARQL: async function(query: string, endpoints: string[]): Promise<BasicResponse<JsonType>> {
        try {
            const response = await requestSPARQL('api/search/fed-sparql', 'POST', query, SparqlHeader, { endpoints: endpoints.join(',') })
            return response
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Error processing SPARQL query ...')
            throw new MyError(error.message, error.status)
        }
    },
}

// Private functions

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: string): Promise<JsonType> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as PlainResponse
    if (response.statusCode >= 500) {
        throw new MyError('Error reaching WoT server -- status code 500', HttpStatusCode.INTERNAL_SERVER_ERROR)
    }
    if (response.statusCode === 400) {
        throw new MyError('Invalid serialization or TD', HttpStatusCode.BAD_REQUEST)
    }
    if (response.statusCode === 404) {
        throw new MyError('TD with the given id not found', HttpStatusCode.NOT_FOUND)
    }
    return response.body as JsonType
}

const requestSPARQL = async (endpoint: string, method: Method, body?: string, headers?: Headers, searchParams?: JsonType): Promise<JsonType> => {
    const response = await callSPARQL(endpoint, { method, body, headers, searchParams }) as PlainResponse
    if (response.statusCode >= 500) {
        throw new MyError('Error reaching WoT server -- status code 500', HttpStatusCode.INTERNAL_SERVER_ERROR)
    }
    if (response.statusCode === 400) {
        throw new MyError('Invalid serialization or TD', HttpStatusCode.BAD_REQUEST)
    }
    if (response.statusCode === 404) {
        throw new MyError('TD with the given id not found', HttpStatusCode.NOT_FOUND)
    }
    // return response.body as JsonType
    return typeof response.body === 'object' ? response.body as JsonType : JSON.parse(response.body as string) as JsonType 
}

const buildResponse = (message?: string | JsonType | JsonType[]): BasicResponse<any> => {
    return { message }
}
