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
import { logger } from '../utils/logger'
import { Thing } from '../types/wot-types'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT,
    responseType: 'json',
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
     * @param id 
     * @param method 
     * @returns 
     */ 
    retrieveInteraction: async function(oid: string, id: string, method: Method, interaction: Interaction, body?: JsonType): Promise<JsonType> {
        logger.debug('Calling: ' + method + ' ' + Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT + 'api/' + interaction + '/' + oid + '/' + id)
        return request('api/' + interaction + '/' + oid + '/' + id , method, body, { ...ApiHeader, Authorization })
    },
    /**
     * Access adapter to get discovery info
     * @param oid
     * @param body 
     * @returns 
     */ 
    retrieveDiscovery: async function(oid: string, body?: JsonType): Promise<JsonType> {
        logger.debug('Calling: POST ' + Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT + 'api/discovery/' + oid)
        return request('api/discovery/' + oid, 'POST', body, { ...ApiHeader, Authorization })
    },
    /**
     * Access adapter to get interaction info
     * Getting URL from WoT
     * @param oid
     * @param id 
     * @param method 
     * @returns 
     */ 
     retrieveInteractionFromWot: async function(oid: string, id: string, method: Method, interaction: Interaction, body?: JsonType): Promise<JsonType> {
        const thing = (await wot.retrieveTD(oid)).message
        if (thing) {
            const forms = getInteractionsForms(interaction, thing, id)
            if (forms) {
                const url = forms[0].href
                const headers = validateContentType(forms[0].contentType)
                return requestSemantic(url , method, body, { ...headers, Authorization })
            } else {
                return Promise.resolve({ success: false, message: 'Thing ' + oid + ' with property ' + id + ' does not specify url to access data...' })
            }
        } else {
            return Promise.resolve({ success: false, message: 'Thing ' + oid + ' not found in infrastructure...' })
        }
    }
}

// PRIVATE FUNCTIONS

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: string): Promise<any> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as JsonType
    return response.body
}

const requestSemantic = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: string): Promise<any> => {
    const response = await callSemantic(endpoint, { method, json, headers, searchParams })
    try {
        return JSON.parse(response.body)
    } catch (err: unknown) {
        return response.body
    }
}

const getInteractionsForms = (interaction: Interaction, thing: Thing, id: string) => {
    const { properties, events } = thing
    switch (interaction) {
        case Interaction.PROPERTY:
            return properties[id].forms
        case Interaction.EVENT:
            return events[id].forms
        default:
            throw new Error('Wrong interaction')
    }
}

const validateContentType = (x?: CONTENT_TYPE_ENUM): { 'Content-Type': CONTENT_TYPE_ENUM, 'Accept': CONTENT_TYPE_ENUM } => {
    if (x) {
        if (!CONTENT_TYPE_LIST.indexOf(x.toLowerCase() as CONTENT_TYPE_ENUM)) {
            logger.warn('Not valid Content-Type provided in TD: ' + x + ' , reverting to default: ' + CONTENT_TYPE_ENUM.PLAIN)
            return { 'Content-Type': CONTENT_TYPE_ENUM.PLAIN, 'Accept': CONTENT_TYPE_ENUM.PLAIN }
        }
        return { 'Content-Type': x, 'Accept': x }
    } else {
        logger.warn('Missing Content-Type in TD, reverting to default: ' + CONTENT_TYPE_ENUM.PLAIN)
        return { 'Content-Type': CONTENT_TYPE_ENUM.PLAIN, 'Accept': CONTENT_TYPE_ENUM.PLAIN }
    }
}

