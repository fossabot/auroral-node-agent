/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 

import got, { Method, Headers } from 'got'
import { JsonType } from '../types/misc-types'
import { Config } from '../config'
import { logger } from '../utils/logger'
import { BasicResponse, TdsResponse, BasicArrayResponse, DeleteResponse, ConsumptionResponse } from '../types/gateway-types'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.GATEWAY.HOST + ':' + Config.GATEWAY.PORT + '/' + Config.GATEWAY.ROUTE,
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

// INTERFACE

export const gateway = {

    // ***** AUTHENTICATION *****

    /**
     * Login an object in VICINITY;
     * Does not reject on error;
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    login: async function(oid: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects/login', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            logger.warn('Object ' + oid + ' was not logged in ...', 'GATEWAY')
            throw new Error(err)
        }
    },

    /**
     * Logout an object in VICINITY;
     * Does not reject on error;
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    logout: async function(oid: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects/logout', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            logger.warn('Object ' + oid + ' was not logged in ...', 'GATEWAY')
            throw new Error(err)
        }
    },

    // ***** REGISTRATION *****

    /**
     * Get list of objects registered under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @returns {error: boolean, message: array of TDs} 
     */
    getRegistrations: async function(): Promise<TdsResponse> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/${Config.GATEWAY.ID}/objects`, 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            logger.warn(`Error getting ${Config.GATEWAY.ID} objects ...`, 'GATEWAY')
            throw new Error(err)
        }
    },

    /**
     * Register object/s under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @param {body: Array of TDs}
     * @returns {error: boolean, message: array of TDs} 
     */
    postRegistrations: async function(body: JsonType[]): Promise<TdsResponse> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/${Config.GATEWAY.ID}/objects`, 'POST', body, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Remove object/s under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @param {body: Array of OIDs}
     * @returns {error: boolean, message: [{value: string, result: string, error: string}]} 
     */
    removeRegistrations: async function(body: string[]): Promise<DeleteResponse> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/${Config.GATEWAY.ID}/objects/delete`, 'POST', body, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * @TBD:
     * Soft update
     * Hard update
     */

    // ***** DISCOVERY *****

    /**
     * Retrieve all objects that your object can see;
     * (Understand object as gateway, service or device instance);
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: [oid: string]} 
     */
    discovery: async function(oid: string): Promise<BasicArrayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * @TBD:
     * SPARQL query
     */

    // ***** RESOURCE CONSUMPTION *****
    // Properties, events and actions

    /**
     * Get a property;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, remote_oid: string, pid: string}
     * @returns {error: boolean, message: object} 
     */
    getProperty: async function(oid: string, remote_oid: string, pid: string): Promise<ConsumptionResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/properties/${pid}`, 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Set a property (PUT);
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, remote_oid: string, pid: string, body: json}
     * @returns {error: boolean, message: object} 
     */
    putProperty: async function(oid: string, remote_oid: string, pid: string, body: JsonType): Promise<ConsumptionResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/properties/${pid}`, 'PUT', body, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Activate the event channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string}
     * @returns {error: boolean, message: string} 
     */
    activateEventChannel: async function(oid: string, eid: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`events/${eid}`, 'POST', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Publish event to channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string, body: object}
     * @returns {error: boolean, message: string} 
     */
    publishEvent: async function(oid: string, eid: string, body: JsonType): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`events/${eid}`, 'PUT', body, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Deactivate event channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string}
     * @returns {error: boolean, message: string} 
     */
    deactivateEventChannel: async function(oid: string, eid: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`events/${eid}`, 'DELETE', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Get status of remote event channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string}
     * @returns {error: boolean, message: string} 
     */
    statusRemoteEventChannel: async function(oid: string, remote_oid: string, eid: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/events/${eid}`, 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Subscribe to remote event channel;
     * (Using the credentials of a service or device);
     * Does not reject on error;
     * @async
     * @param {oid: string, eid: string}
     * @returns {error: boolean, message: string} 
     */
    subscribeRemoteEventChannel: async function(oid: string, remote_oid: string, eid: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/events/${eid}`, 'POST', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * Unsubscribe to remote event channel;
     * (Using the credentials of a service or device);
    * Does not reject on error;
    * @async
    * @param {oid: string, eid: string}
    * @returns {error: boolean, message: string} 
    */
    unsubscribeRemoteEventChannel: async function(oid: string, remote_oid: string, eid: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/events/${eid}`, 'DELETE', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    },

    /**
     * @TBD
     * Execute action on remote object
     * Update status of a task
     * Retrieve the status or a return value of a given task
     * Cancel a task in progress
     */

    // HealthCheck

    /**
     * Does a health check by trying to log in VICINITY;
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    health: async function(oid?: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects/login', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            throw new Error(err)
        }
    }

}

// PRIVATE FUNCTIONS

const getAuthorization = async (oid?: string): Promise<string> => {
    // if (oid) {
        // const credentials = await persistance.getCredentials(oid)
        // if (!credentials) {
        //     throw new Error(`Missing authorization for object ${oid}`)
        // }
    //     return ''
    // } else {
    //     return '' // GATEWAY CREDS
    // }
    return ''
}

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: string): Promise<any> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as JsonType
    return response.body
}
