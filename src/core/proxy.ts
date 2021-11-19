/**
 * PROXY API SUPPORT
 * Get responses from adapter
 */

import { JsonType, AdapterMode, BasicResponse, RelationshipType } from '../types/misc-types'
import { Config } from '../config'
import { proxy } from '../microservices/proxy'
import { wot } from '../microservices/wot'
import * as persistance from '../persistance/persistance'
import { Thing } from '../types/wot-types'
import { logger, errorHandler } from '../utils'
import { registrationFuncs } from '../persistance/models/registrations'

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

enum registrationAndInteractions {
    REGISTRATIONS = 'registrations',
    PROPERTIES = 'properties',
    ACTIONS = 'actions',
    EVENTS = 'events'
}

export interface Options {
    method?: Method
    id?: string
    body?: JsonType
    sparql?: string
    interaction: Interaction
    relationship?: string
    items?: string[]
}

export const getData = async (oid: string, options: Options, relationship?: RelationshipType, items?: string[]): Promise<JsonType> => {
    if (options.interaction === Interaction.DISCOVERY) {
        if (Config.GATEWAY.ID === oid) {
            if (Config.WOT.ENABLED) {
                if (options.sparql) {
                    return sparqlDiscovery(options.sparql)
                } else {
                    return semanticDiscovery(relationship, items)
                }
            } else {
                // wot disabled 
                if (relationship === RelationshipType.ME) {
                    const registeredItems = await persistance.getItem(registrationAndInteractions.REGISTRATIONS) as unknown as string[]
                    const returnItems = await Promise.all(registeredItems.map(async (it) => {
                        return persistance.getItem(registrationAndInteractions.REGISTRATIONS, it)
                    }))
                    return { message: returnItems.filter(it => it) }
                } else if (items !== undefined) {
                    const returnItems = await Promise.all(items.map(async (it) => {
                        return persistance.getItem(registrationAndInteractions.REGISTRATIONS, it)
                    }))
                    return { message: returnItems.filter(it => it) as unknown as Thing[] }
                } else {
                    return { message: {} }
                }
            }
        } else {
            // test if device is accesible 
            if (items && items.indexOf(oid) || relationship === RelationshipType.ME) {
                return Config.WOT.ENABLED ? wot.retrieveTD(oid) : persistance.getItem(registrationAndInteractions.REGISTRATIONS, oid)
            } else {
                return { message: {} }
            }
        }
    } else {
        if (Config.ADAPTER.MODE === AdapterMode.DUMMY) {
            return Promise.resolve({ success: true, value: 100, object: oid, interaction: options.interaction })
        } else if (Config.ADAPTER.MODE === AdapterMode.SEMANTIC) {
            return options.id && options.method ?
                proxy.retrieveInteractionFromWot(oid, options.id, options.method, options.interaction, options.body) :
                Promise.resolve({ success: false, message: 'Missing parameters' })
        } else {
            return options.id && options.method ?
                proxy.retrieveInteraction(oid, options.id, options.method, options.interaction, options.body) :
                Promise.resolve({ success: false, message: 'Missing parameters' })
        }
    }
}

// PRIVATE

const semanticDiscovery = async (relationship?: string, items?: string[]): Promise<BasicResponse<Thing | Thing[]>> => {
    try {
        let rel = relationship
        if (!relationship) {
            rel = RelationshipType.OTHER
        }
        if (rel === RelationshipType.ME) {
            const allItems = await registrationFuncs.getItem() as string[]
            const things = await Promise.all(allItems.map(async it => {
                return (await wot.retrieveTD(it)).message
            }))
            return { message: things } as BasicResponse<Thing[]>
        } else {
            if (!items) {
                return { message: [] }
            } else {
                const things = await Promise.all(items.map(async it => {
                    return (await wot.retrieveTD(it)).message
                }))
                return { message: things.filter(it => it) as unknown as Thing[] }
            }
        }
    } catch (err: unknown) {
        const error = errorHandler(err)
        logger.debug(error.message)
        return { error: error.message }
    }
}

const sparqlDiscovery = async (sparql: string) => {
    const test = wot.searchSPARQL(sparql)
    console.log(test)
    return {}
}
