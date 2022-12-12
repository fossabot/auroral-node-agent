/**
* PROXY request
* Send message to any connected adapter listening on agreed URL
* @interface
*/ 

import got, { Method, Headers } from 'got'
import { JsonType, CONTENT_TYPE_ENUM, CONTENT_TYPE_LIST } from '../types/misc-types'
import { Config } from '../config'
import { Interaction } from '../core/data'
import { wot } from './wot'
import { HttpStatusCode, logger, MyError } from '../utils'
import { Thing } from '../types/wot-types'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT,
    responseType: 'text',
    isStream: false,
    retry: 2, // Retries on failure N times
    throwHttpErrors: true, // If true 4XX and 5XX throw an error
    timeout: 30000, // 30sec to timeout
    decompress: true // accept-encoding header gzip
})

const callSemantic = got.extend({
    // prefixUrl: Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT,
    responseType: 'text',
    isStream: false,
    retry: 2, // Retries on failure N times
    throwHttpErrors: true, // If true 4XX and 5XX throw an error
    timeout: 30000, // 30sec to timeout
    decompress: true // accept-encoding header gzip
})

const ApiHeader = { 
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
    simple: 'false' 
}

const Authorization = undefined // TBD set up some auth options

// FUNCTIONS

export const proxy = {
    /**
     * Access adapter to get interaction info
     * @param oid
     * @param iid // Interaction id
     * @param method 
     * @returns 
     */ 
    sendMessageViaProxy: async function(oid: string, iid: string, method: Method, interaction: Interaction, sourceoid: string, body?: JsonType, reqParams?: JsonType): Promise<JsonType> {
        logger.debug('Calling: ' + method + ' ' + Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT + 'api/' + interaction + '/' + oid + '/' + iid)
        return request('api/' + interaction + '/' + oid + '/' + iid , method, body, { ...ApiHeader, Authorization, sourceoid }, reqParams)
    },
    /**
     * Access adapter to get interaction info
     * Getting URL from WoT
     * @param oid
     * @param iid 
     * @param method 
     * @returns 
     */ 
     sendMessageViaWot: async function(oid: string, iid: string, method: Method, interaction: Interaction, sourceoid: string, body?: JsonType, reqParams?: JsonType): Promise<JsonType> {
            const thing = (await wot.retrieveTD(oid)).message
            if (!thing) {
                return Promise.resolve({ success: false, message: 'Thing ' + oid + ' not found in infrastructure...' })
            }
            try {
                const url = getInteractionUrl(interaction, thing, iid, reqParams)
                const headers = validateContentType(interaction, thing, iid)
                // Store searchParams in object (for got)
                const searchParams = {} as any
                url.searchParams.forEach((key: string, value: any) => {
                    searchParams[key] = value
                })
                return requestSemantic(url.href , method, body, { ...headers, Authorization, sourceoid }, searchParams)
            } catch (error) {
                return Promise.resolve({ success: false, message: 'Thing ' + oid + ' with property ' + iid + ' does not specify url to access data...' })
            }
    }
}

// PRIVATE FUNCTIONS

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: JsonType): Promise<any> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as JsonType
    try {
        return JSON.parse(response.body)
    } catch (err: unknown) {
        logger.warn('Body is not in JSON format')
        return response.body
    }
}

const requestSemantic = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: JsonType): Promise<any> => {
    const response = await callSemantic(endpoint, { method, json, headers, searchParams })
    try {
        return JSON.parse(response.body)
    } catch (err: unknown) {
        return response.body
    }
}

const getInteractionUrl = (interaction: Interaction, thing: Thing, id: string, reqParams?:  JsonType) => {
    const { properties } = thing
    let url: URL
    if (interaction === Interaction.PROPERTY) {
        // PROPERTY
        try {
            // Eveything from TD property
            url = new URL(properties[id].forms![0].href)
        } catch (error) {
            // failed - merge with base url
            if (!thing.base) {
                throw new MyError('PID href is not absolute and Thing does not specify base url', HttpStatusCode.BAD_REQUEST)
            }
            const baseUrl = new URL(thing.base)
            // origin + path + relative path from TD  
            // split to remove double slashes
            const href = (baseUrl.origin + baseUrl.pathname + '/' + properties[id].forms![0].href).split('/').filter(x => x).join('/')
            url = new URL(href)
        }
        // add reqParams
        if (reqParams) {
            Object.entries(reqParams).forEach(([key, value]) => {
                url.searchParams.set(key, value)
            })
        }
    } else if (interaction === Interaction.EVENT) {
        // EVENT
        if (!thing.base) {
            throw new MyError('BASE URL not specified in TD, recipient of event could not be found, dropping message...', HttpStatusCode.BAD_REQUEST)
        }
        url = new URL(thing.base)
        // add static /events/oid and remove trailing slash
        url.pathname = (url.pathname +  '/events/' + id).split('/').filter(x => x).join('/')
    } else {
        throw new MyError('Wrong interaction', HttpStatusCode.BAD_REQUEST)
    }
    return url
}

const validateContentType = (interaction: Interaction, thing: Thing, id: string): { 'Content-Type': CONTENT_TYPE_ENUM, 'Accept': CONTENT_TYPE_ENUM } => {
    if (interaction === Interaction.PROPERTY) {
        const { properties } = thing
        const x = properties[id].forms![0].contentType
        const y = properties[id].forms![0].response?.contentType
        if (x && !CONTENT_TYPE_LIST.indexOf(x.toLowerCase() as CONTENT_TYPE_ENUM)) {
            logger.warn('Not valid Content-Type provided in TD: ' + x + ' , reverting to default: ' + CONTENT_TYPE_ENUM.JSON)
            return { 'Content-Type': CONTENT_TYPE_ENUM.JSON, 'Accept': CONTENT_TYPE_ENUM.JSON }
        }
        return { 'Content-Type': x || CONTENT_TYPE_ENUM.JSON, 'Accept': y || CONTENT_TYPE_ENUM.JSON }
    } else {
        logger.debug('Using default content type and accept headers: ' + CONTENT_TYPE_ENUM.JSON)
        return { 'Content-Type': CONTENT_TYPE_ENUM.JSON, 'Accept': CONTENT_TYPE_ENUM.JSON }
    }
}

