/**
 * PROXY API SUPPORT
 * Get responses from adapter
 */

import { JsonType, AdapterMode, RelationshipType } from '../types/misc-types'
import { Config } from '../config'
import { proxy } from '../microservices/proxy'
import { wot } from '../microservices/wot'
import { logger, errorHandler } from '../utils'

// Constants 
    
/* Predefined graph filter syntax */
const GRAPHSTART = ' GRAPH $g { '
const GRAPHFILTER = ' } FILTER ( $g IN ( '
const GRAPHEND = ' )) '

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
const reachAdapter = async (oid: string, iid: string, method: Method, interaction: Interaction, body?: JsonType): Promise<JsonType> => {
        if (Config.ADAPTER.MODE === AdapterMode.DUMMY) {
            if (interaction === Interaction.EVENT) {
                logger.info('Event received in dummy mode...')
                logger.info(body)
                return Promise.resolve({ success: true })
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

/**
 * Retrieve Thing Description from WoT
 * @param oid 
 * @param origindId 
 * @param relationship 
 * @param items 
 * @returns 
 */
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

/**
 * Send SPARQL to WoT
 * @param oid 
 * @param originId 
 * @param relationship 
 * @param sparql 
 * @param items 
 * @returns 
 */
const semanticDiscovery = async (oid: string, originId: string, relationship: string, sparql: string, items?: string[]) => {
    try {
        if (Config.GATEWAY.ID !== oid) {
            throw new Error('Sparql query has to be address to a AGID')
        }
        if (relationship === RelationshipType.ME) {
            return wot.searchSPARQL(sparql)
        } else {
            if (items) {
                const sparqlWithFilters = filterOidsInSparql(sparql, items)
                return wot.searchSPARQL(sparqlWithFilters)
            } else {
                throw new Error('No items visible for your organisation in this SPARQL query...')
            }
        }
    } catch (err: unknown) {
        const error = errorHandler(err)
        logger.debug(error.message)
        return { error: error.message }
    }
}

/**
 * Enriches SPARQL to filter only OIDs or
 * Graphs in semantic language that I am
 * allowed to see
 * @param sparql 
 * @returns 
 */
const filterOidsInSparql = (sparql: string, items: string[]): string => {
    // Locate positions to break original query and insert graph filtering
    const ini = sparql.indexOf('{')
    const end = sparql.lastIndexOf('}')
    // Break original query
    const queryStart = sparql.slice(0, ini + 1)
    const queryMid = sparql.slice(ini + 1, end)
    // Obtain graphs that need to be included in query
    const graphs = items.map(it => '<graph:' + it + '>')
    const graphStr = graphs.join(',')
    // Reconstruct and return query
    return queryStart + GRAPHSTART + queryMid + GRAPHFILTER + graphStr + GRAPHEND + '}'
}
