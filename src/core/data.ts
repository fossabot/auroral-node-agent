/**
 * PROXY API SUPPORT
 * Get responses from adapter
 */

import { JsonType, AdapterMode, RelationshipType } from '../types/misc-types'
import { Config } from '../config'
import { proxy } from '../microservices/proxy'
import { wot } from '../microservices/wot'
import { logger, errorHandler } from '../utils'

// Types

export enum Method {
    POST = 'POST',
    GET = 'GET',
    PUT = 'PUT'
}

export enum Interaction {
    PROPERTY = 'property',
    EVENT = 'event',
    DISCOVERY = 'discovery'
}

// Public Methods

export const Data = {
    readProperty: async (oid: string, pid: string) => {
        return reachAdapter(oid, pid, Method.GET, Interaction.PROPERTY)
    },
    updateProperty: async (oid: string, pid: string, body: JsonType) => {
        return reachAdapter(oid, pid, Method.PUT, Interaction.PROPERTY, body)
    },
    receiveEvent: async (oid: string, eid: string, body: JsonType) => {
        return reachAdapter(oid, eid, Method.PUT, Interaction.EVENT, body)
    },
    tdDiscovery: async (oid: string, originId: string, relationship: RelationshipType, items?: string[]) => {
        return thingDiscovery(oid, originId, relationship, items)
    },
    sparqlDiscovery: async (oid: string, originId: string, relationship: RelationshipType, sparql: string, items?: string[]) => {
        return semanticDiscovery(oid, originId, relationship, sparql, items)
    }
}

// PRIVATE

/**
 * Access adapter to fetch actual values/measurements/...
 * Update properties or send event messages
 * @param oid 
 * @param iid interaction ID (pid, eid, aid)
 * @param method 
 * @param interaction 
 * @param body 
 * @returns 
 */
const reachAdapter = async (oid: string, iid: string, method: Method, interaction: Interaction, body?: JsonType) => {
        if (Config.ADAPTER.MODE === AdapterMode.DUMMY) {
            if (interaction === Interaction.EVENT) {
                logger.info('Event received in dummy mode...')
                logger.info(body)
                return Promise.resolve()
            } else {
                return Promise.resolve({ success: true, value: 100, object: oid, interaction: interaction })
            }
        } else if (Config.ADAPTER.MODE === AdapterMode.SEMANTIC) {
            return iid && method ?
                proxy.sendMessageViaWot(oid, iid, method, interaction, body) :
                Promise.resolve({ success: false, message: 'Missing parameters' })
        } else {
            return iid && method ?
                proxy.sendMessageViaProxy(oid, iid, method, interaction, body) :
                Promise.resolve({ success: false, message: 'Missing parameters' })
        }
}

const thingDiscovery = async(oid: string, origindId: string, relationship: RelationshipType, items?: string[]): Promise<JsonType> => {
    if (relationship === RelationshipType.ME) {
        logger.debug('Own item ' + origindId + ' granted access to TD of ' + oid)
        return wot.retrieveTD(oid)
    } else {
        if (items &&  items.indexOf(oid) !== -1) {
            logger.debug('Remote item ' + origindId + ' granted access to TD of ' + oid)
            return wot.retrieveTD(oid)
        } else {
            logger.debug('Remote item ' + origindId + ' access restricted to TD of ' + oid)
            return Promise.resolve({})
        }
    }
}

const semanticDiscovery = async (oid: string, originId: string, relationship: string, sparql: string, items?: string[]) => {
    try {
        if (Config.GATEWAY.ID !== oid) {
            throw new Error('Sparql query has to be address to a AGID')
        }
        if (relationship === RelationshipType.ME) {
            return wot.searchSPARQL(sparql)
        } else {
            logger.debug('SPARQL discovery to foreign Nodes is under construction')
            throw new Error('SPARQL discovery to foreign Nodes is under construction')
        }
    } catch (err: unknown) {
        const error = errorHandler(err)
        logger.debug(error.message)
        return { error: error.message }
    }
}
