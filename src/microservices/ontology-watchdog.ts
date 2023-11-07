/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 

import got, { Method, Headers } from 'got'
import { JsonType, OntologyType } from '../types/misc-types'
import { Config } from '../config'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.VALIDATOR.ONTOLOGIES_HOST,
    responseType: 'json',
    isStream: false,
    // retry: 0, // Retries on failure N times
    throwHttpErrors: true, // If true 4XX and 5XX throw an error
    timeout: Config.GATEWAY.TIMEOUT, // 30sec to timeout is the default
    decompress: true // accept-encoding header gzip
})

const ApiHeader = { 
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
}

// INTERFACE

export const ontologyWatchdog = {
    getAll: async function(): Promise<OntologyType[]> {
        const response = (await request('api/ontologies', 'GET', undefined, { ...ApiHeader })) as unknown as { message: OntologyType[], statusCode: number }
        if (response.statusCode !== 200) {
            throw new Error('Ontologies not found in Ontology Watchdog')
        }
        return response.message
    },
    getById: async function(id: string): Promise<OntologyType> {
        const response = (await request(`api/ontologies/${id}`, 'GET', undefined, { ...ApiHeader })) as unknown as { message: OntologyType, statusCode: number }
        if (response.statusCode !== 200) {
            throw new Error('Ontology not found in Ontology Watchdog')
        }
        return response.message
    }
}
const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: JsonType): Promise<{ message: JsonType[] | JsonType, error: boolean}> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as JsonType
    return response.body
}
