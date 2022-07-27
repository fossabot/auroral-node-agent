/**
* interface.js
* Interface to interact with the gateway API
* Used from external (API) and internal requests
* @interface
*/ 

import got, { Method, Headers } from 'got'
import { JsonType, IItemPrivacy, WholeContractType, CommunityType } from '../types/misc-types'
import { Config } from '../config'
import { logger, errorHandler, MyError, HttpStatusCode } from '../utils'
import { GtwDeleteResponse, GatewayResponse, RemovalBody, GtwRegistrationResponse, GtwUpdateResponse, IdDiscoveryType, BasicResponse, GtwGetRegistrationsResponse, NodeType } from '../types/gateway-types'
import { RegistrationBody, RegistrationnUpdateNm } from '../persistance/models/registrations'
import { getCredentials } from '../persistance/persistance'

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
    login: async function(oid?: string): Promise<GatewayResponse> {
        const Authorization = await getAuthorization(oid)
        return request('objects/login', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
    },

    /**
     * Logout an object in VICINITY;
     * Does not reject on error;
     * @async
     * @param {oid: string}
     * @returns {error: boolean, message: string} 
     */
    logout: async function(oid?: string): Promise<GatewayResponse> {
        const Authorization = await getAuthorization(oid)
        return request('objects/logout', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
    },

    // ***** REGISTRATION *****

    /**
     * Get list of objects registered under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @returns {error: boolean, message: array of TDs} 
     */
    getRegistrations: async function(): Promise<GtwGetRegistrationsResponse> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/${Config.GATEWAY.ID}/objects`, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as GtwGetRegistrationsResponse
        } catch (err) {
            const error = errorHandler(err)
            logger.warn(`Error getting ${Config.GATEWAY.ID} objects ...`)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Register object/s under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @param {body: Array of TDs}
     * @returns {error: boolean, message: array of TDs} 
     */
    postRegistrations: async function(body: { items: RegistrationBody[], agid: string }): Promise<GtwRegistrationResponse> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/${Config.GATEWAY.ID}/objects`, 'POST', body, { ...ApiHeader, Authorization }) as unknown as GtwRegistrationResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Update object under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @param {body: Array of TDs}
     * @returns {error: boolean, message: array of TDs} 
     */
     updateRegistration: async function(body: { items: RegistrationnUpdateNm[], agid: string }): Promise<GtwUpdateResponse> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/${Config.GATEWAY.ID}/objects`, 'PUT', body, { ...ApiHeader, Authorization }) as unknown as GtwUpdateResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Remove object/s under your gateway;
     * (Using the access point credentials generated for it);
     * @async
     * @param {body: Array of OIDs}
     * @returns {error: boolean, message: [{value: string, result: string, error: string}]} 
     */
    removeRegistrations: async function(body: { oids: string[] }): Promise<GtwDeleteResponse> {
        try {
            const Authorization = await getAuthorization()
            const data: RemovalBody = { ...body, agid: Config.GATEWAY.ID }
            return request(`agents/${Config.GATEWAY.ID}/objects/delete`, 'POST', data, { ...ApiHeader, Authorization }) as unknown as GtwDeleteResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)        
        }
    },

    /**
     * @TBD:
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
    discovery: async function(oid?: string): Promise<IdDiscoveryType> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as IdDiscoveryType
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Retrieve all nodes that you can see from an organisation;
     * (Understand object as gateway, service or device instance);
     * (Using the credentials of the gateway);
     * @async
     * @param {cid: string}
     * @returns {error: boolean, message: NodeType[]} 
    */
    organisationNodes: async function(cid?: string): Promise<BasicResponse<NodeType[]>> {
        try {
            const Authorization = await getAuthorization()
            const url = cid ? 'discovery/nodes/organisation/' + cid : 'discovery/nodes/organisation'
            return request(url, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<NodeType[]>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Retrieve all nodes that you can see from an organisation;
     * (Understand object as gateway, service or device instance);
     * (Using the credentials of the gateway);
     * @async
     * @param {commid: string}
     * @returns {error: boolean, message: NodeType[]} 
    */
     communityNodes: async function(commid: string): Promise<BasicResponse<NodeType[]>> {
        try {
            const Authorization = await getAuthorization()
            return request('discovery/nodes/community/' + commid, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<NodeType[]>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Retrieve all items that you can see from your organisation;
     * (Understand object as gateway, service or device instance);
     * (Using the credentials of the gateway);
     * @async
     * @returns {error: boolean, message: string[]} 
    */
    organisationItems: async function(): Promise<BasicResponse<string[]>> {
        try {
            const Authorization = await getAuthorization()
            return request('discovery/items/organisation', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<string[]>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Retrieve all items that you can see from your organisation;
     * (Understand object as gateway, service or device instance);
     * (Using the credentials of the gateway);
     * @async
     * @param {ctid: string}
     * @returns {error: boolean, message: string[]} 
    */
    contractItems: async function(ctid: string): Promise<BasicResponse<string[]>> {
        try {
            const Authorization = await getAuthorization()
            return request('discovery/items/contract/' + ctid, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<string[]>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
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
    discoveryRemote: async function(oid: string, params: { sparql?: string, originId?: string }): Promise<GatewayResponse> {
        try {
            const { originId, sparql } = params
            const query = typeof sparql === 'string' ? { sparql } : undefined
            const Authorization = await getAuthorization(originId)
            return request(`objects/${oid}`, 'POST', query, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
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
    getCid: async function(reqid: string): Promise<BasicResponse<string>> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/cid/${reqid}`, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<string>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Get partners;
     * Get your organisation partners;
     * (Using the credentials of the gateway);
     * @async
     * @returns {error: boolean, message: cid: string} 
     */
    getPartners: async function(): Promise<BasicResponse<string[]>> {
        try {
            const Authorization = await getAuthorization()
            return request('agents/partners', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<string[]>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Get communities;
     * Get the communities where your node participates;
     * (Using the credentials of the gateway);
     * @async
     * @returns {error: boolean, message: cid: string} 
     */
     getCommunities: async function(): Promise<BasicResponse<CommunityType[]>> {
        try {
            const Authorization = await getAuthorization()
            return request('agents/communities', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<CommunityType[]>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },
    
    /**
     * Get partner info;
     * Get info about one of your partners;
     * (Using the credentials of the gateway);
     * @async
     * @returns {error: boolean, message: cid: string} 
     */
    getPartnerInfo: async function(cid: string): Promise<BasicResponse<{ name: string, nodes: string[]}>> {
        try {
            const Authorization = await getAuthorization()
            return request(`agents/partner/${cid}`, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<{ name: string, nodes: string[]}>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
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
    getProperty: async function(oid: string, remote_oid: string, pid: string, reqParams: JsonType): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/properties/${pid}`, 'GET', undefined, { ...ApiHeader, Authorization }, reqParams) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Set a property (PUT);
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, remote_oid: string, pid: string, body: json}
     * @returns {error: boolean, message: object} 
     */
    putProperty: async function(oid: string, remote_oid: string, pid: string, body: JsonType, reqParams: JsonType): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/properties/${pid}`, 'PUT', body, { ...ApiHeader, Authorization }, reqParams) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Get event channels;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, remoteOid: string}
     * @returns {error: boolean, message: string} 
     */
     getObjectEventChannels: async function(oid: string, remoteOid: string): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remoteOid}/events`, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Activate the event channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string}
     * @returns {error: boolean, message: string} 
     */
    activateEventChannel: async function(oid: string, eid: string): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`events/${eid}`, 'POST', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Publish event to channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string, body: object}
     * @returns {error: boolean, message: string} 
     */
    publishEvent: async function(oid: string, eid: string, body: JsonType): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`events/${eid}`, 'PUT', body, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Deactivate event channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string}
     * @returns {error: boolean, message: string} 
     */
    deactivateEventChannel: async function(oid: string, eid: string): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`events/${eid}`, 'DELETE', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },

    /**
     * Get status of remote event channel;
     * (Using the credentials of a service or device);
     * @async
     * @param {oid: string, eid: string}
     * @returns {error: boolean, message: string} 
     */
    statusRemoteEventChannel: async function(oid: string, remote_oid: string, eid: string): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/events/${eid}`, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
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
    subscribeRemoteEventChannel: async function(oid: string, remote_oid: string, eid: string): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/events/${eid}`, 'POST', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
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
    unsubscribeRemoteEventChannel: async function(oid: string, remote_oid: string, eid: string): Promise<GatewayResponse> {
        try {
            const Authorization = await getAuthorization(oid)
            return request(`objects/${remote_oid}/events/${eid}`, 'DELETE', undefined, { ...ApiHeader, Authorization }) as unknown as GatewayResponse
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
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
    health: async function(oid?: string): Promise<BasicResponse<string>> {
        try {
            const Authorization = await getAuthorization(oid)
            return request('objects/login', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<string>
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return Promise.resolve({ error: error.message, message: 'Error' })
        }
    },

    /**
    * Get a privacy status of all node items
    * @async
    * @param 
    * @returns {error: boolean, message: object} 
    */
     getItemsPrivacy: async function (): Promise<BasicResponse<IItemPrivacy[]>> {
        try {
            const Authorization = await getAuthorization()
            return request('security/privacy', 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<IItemPrivacy[]>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    },
    /**
    * Get a privacy status of all node items
    * @async
    * @param 
    * @returns {error: boolean, message: object} 
    */
     getContracts: async function (cid: string): Promise<BasicResponse<WholeContractType>> {
        try {
            const Authorization = await getAuthorization()
            return request('security/contracts/' + cid, 'GET', undefined, { ...ApiHeader, Authorization }) as unknown as BasicResponse<WholeContractType>
        } catch (err) {
            const error = errorHandler(err)
            throw new MyError(error.message, error.status)
        }
    }
}

// PRIVATE FUNCTIONS

const getAuthorization = async (oid?: string): Promise<string> => {
    if (oid) {
        const credentials = await getCredentials(oid)
        if (!credentials) {
            throw new MyError(`Missing authorization for object ${oid}`, HttpStatusCode.UNAUTHORIZED)
        }
        return credentials
    } else {
        const creds = Buffer.from(Config.GATEWAY.ID + ':' + Config.GATEWAY.PASSWORD, 'utf-8').toString('base64') // GATEWAY CREDS
        return 'Basic ' +  creds
    }
}

const request = async (endpoint: string, method: Method, json?: JsonType, headers?: Headers, searchParams?: JsonType): Promise<{ message: JsonType[] | JsonType, error: boolean}> => {
    const response = await callApi(endpoint, { method, json, headers, searchParams }) as JsonType
    return response.body
}
