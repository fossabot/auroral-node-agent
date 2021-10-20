/**
 * PROXY API SUPPORT
 * Get responses from adapter
 */

import { JsonType, AdapterMode } from '../types/misc-types'
import { Config } from '../config'
import { proxy } from '../microservices/proxy'
import { wot } from '../microservices/wot'
import * as persistance from '../persistance/persistance'

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
    interaction: Interaction
}

export const getData = async (oid: string, options: Options): Promise<JsonType>  => {
    if (options.interaction === Interaction.DISCOVERY) {
        if (Config.WOT.ENABLED) {
            // If ID matches the gateway is a request all infrastructure TDs
            return Config.GATEWAY.ID === oid ? wot.retrieveTDs() : wot.retrieveTD(oid)
        } else {
            return persistance.getItem(registrationAndInteractions.REGISTRATIONS , oid)
        }
        // return proxy.retrieveDiscovery(oid, options.body)
    } else {    
        if (Config.ADAPTER.MODE === AdapterMode.DUMMY) {
            return Promise.resolve({ success: true, value: 100, object: oid, interaction: options.interaction })
        } else {
            return options.id && options.method ?
                proxy.retrieveInteraction(oid, options.id, options.method, options.interaction, options.body) :
                Promise.resolve({ success: false, message: 'Missing parameters' }) 
        }
    }    
}
