/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 

import got, { Method, Headers } from 'got'
import { JsonType, BasicResponse, IItemPrivacy, RelationshipType } from '../types/misc-types'
import { Config } from '../config'
import { logger, errorHandler } from '../utils'
import { DeleteResponse, ConsumptionResponse, RemovalBody, RegistrationResult } from '../types/gateway-types'
import { Registration, RegistrationBody } from '../persistance/models/registrations'
import { getCredentials } from '../persistance/persistance'
import { Thing } from '../types/wot-types'

// CONSTANTS 

const callApi = got.extend({
    prefixUrl: Config.GATEWAY.HOST + ':' + Config.GATEWAY.PORT + '/' + Config.GATEWAY.ROUTE,
    responseType: 'json',
    isStream: false,
    retry: 2, // Retries on failure N times
    throwHttpErrors: true, // If true 4XX and 5XX throw an error
    timeout: Config.GATEWAY.TIMEOUT, // 30sec to timeout is the default
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
    login: async function(oid?: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects/login', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not logged in ...')
            throw new Error(error.message)
        }
    },

    /**
     * Logout an object in VICINITY;
     * Does not reject on error;
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    logout: async function(oid?: string): Promise<BasicResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects/logout', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            const error = errorHandler(err)
            logger.warn('Object ' + oid + ' was not logged in ...')
            throw new Error(error.message)
        }
    },

    // ***** REGISTRATION *****

    /**
     * Get list of objects registered under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @returns {error: boolean, message: array of TDs} 
     */
    getRegistrations: async function(): Promise<string[]> {
        try {
            const Authorization = await getAuthorization()
            return (await request(`agents/${Config.GATEWAY.ID}/objects`, 'GET', undefined, { ...ApiHeader, Authorization })).message
        } catch (err) {
            const error = errorHandler(err)
            logger.warn(`Error getting ${Config.GATEWAY.ID} objects ...`)
            throw new Error(error.message)
        }
    },

    /**
     * Register object/s under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @param {body: Array of TDs}
     * @returns {error: boolean, message: array of TDs} 
     */
    postRegistrations: async function(body: { items: RegistrationBody[], agid: string }): Promise<RegistrationResult> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/${Config.GATEWAY.ID}/objects`, 'POST', body, { ...ApiHeader, Authorization })
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },

    /**
     * Remove object/s under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @param {body: Array of OIDs}
     * @returns {error: boolean, message: [{value: string, result: string, error: string}]} 
     */
    removeRegistrations: async function(body: { oids: string[] }): Promise<DeleteResponse> {
        try {
            const Authorization = await getAuthorization()
            const data: RemovalBody = { ...body, agid: Config.GATEWAY.ID }
            return request(`agents/${Config.GATEWAY.ID}/objects/delete`, 'POST', data, { ...ApiHeader, Authorization })
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)        
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
    discovery: async function(oid?: string): Promise<string[]> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },

    /**
     * Retrieve TD from remote gateway or object;
     * (Understand object as gateway, service or device instance);
     * (Using the credentials of the gateway or an item if originId is provided);
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: [oid: string]} 
     */
    discoveryRemote: async function(oid: string, params: { sparql?: JsonType, originId?: string }): Promise<BasicResponse<Registration>[] | BasicResponse<Thing>[]> {
        try {
            const { originId, sparql } = params
            const Authorization = await getAuthorization(originId)
            return (await request(`objects/${oid}`, 'POST', sparql, { ...ApiHeader, Authorization })).message
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },

    /**
     * Retrieve CID;
     * (For any given object get its organisation(agid or oid));
     * (Using the credentials of the gateway);
     * @async
     * @param {reqid: string}
     * @returns {error: boolean, message: cid: string} 
     */
    getCid: async function(reqid: string): Promise<string> {
        try {
            const Authorization = await getAuthorization()
            return (await request(`agents/cid/${reqid}`, 'GET', undefined, { ...ApiHeader, Authorization })).message
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },

    /**
     * Get partners;
     * Get your organisation partners;
     * (Using the credentials of the gateway);
     * @async
     * @returns {error: boolean, message: cid: string} 
     */
    getPartners: async function(): Promise<string[]> {
        try {
            const Authorization = await getAuthorization()
            return (await request('agents/partners', 'GET', undefined, { ...ApiHeader, Authorization })).message
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },

    /**
     * Get partner info;
     * Get info about one of your partners;
     * (Using the credentials of the gateway);
     * @async
     * @returns {error: boolean, message: cid: string} 
     */
    getPartnerInfo: async function(cid: string): Promise<{ name: string, nodes: string[]}> {
        try {
            const Authorization = await getAuthorization()
            return (await request(`agents/partner/${cid}`, 'GET', undefined, { ...ApiHeader, Authorization })).message
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },

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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const error = errorHandler(err)
            throw new Error(error.message)
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
            const data = await request('objects/login', 'GET', undefined, { ...ApiHeader, Authorization })
            // Store redundant variable data to catch any errors from GOT here
            return data
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return Promise.resolve({ error: error.message })
        }
    },

    /**
    * Get a relationship with CID or OID
    * @async
    * @param {rid: string}
    * @returns {error: boolean, message: object} 
    */
    getRelationship: async function (rid: string): Promise<BasicResponse<RelationshipType>> {
        try {
            const Authorization = await getAuthorization()
            return request(`security/relationship/${rid}`, 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    },
    /**
    * Get a privacy status of all node items
    * @async
    * @param 
    * @returns {error: boolean, message: object} 
    */
     getItemsPrivacy: async function (): Promise<ConsumptionResponse<IItemPrivacy>> {
        try {
            const Authorization = await getAuthorization()
            return request('security/privacy', 'GET', undefined, { ...ApiHeader, Authorization })
        } catch (err) {
            const error = errorHandler(err)
            throw new Error(error.message)
        }
    }
}

// PRIVATE FUNCTIONS

const getAuthorization = async (oid?: string): Promise<string> => {
    if (oid) {
        const credentials = await getCredentials(oid)
        if (!credentials) {
            throw new Error(`Missing authorization for object ${oid}`)
        }
        return credentials
    } else {
        const creds = Buffer.from(Config.GATEWAY.ID + ':' + Config.GATEWAY.PASSWORD, 'utf-8').toString('base64') // GATEWAY CREDS
        return 'Basic ' +  creds
    }
}

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: string): Promise<any> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as JsonType
    return response.body
}
