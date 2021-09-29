/**
* PROXY request
* Send message to any connected adapter listening on agreed URL
* @interface
*/ 

import got, { Method, Headers } from 'got'
import { JsonType } from '../types/misc-types'
import { Config } from '../config'
import { Interaction } from '../core/proxy'

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
        return request('api/' + interaction + '/' + oid + '/' + id , method, undefined, { ...ApiHeader, Authorization })
    },
    /**
     * Access adapter to get discovery info
     * @param oid
     * @param body 
     * @returns 
     */ 
    retrieveDiscovery: async function(oid: string, body?: JsonType): Promise<JsonType> {
        return request('api/discovery/' + oid, 'GET', body, { ...ApiHeader, Authorization })
    }
}

// PRIVATE FUNCTIONS

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: string): Promise<any> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as JsonType
    return response.body
}
