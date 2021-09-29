/**
 * PROXY API SUPPORT
 * Get responses from adapter
 */

import { JsonType, AdapterMode } from '../types/misc-types'
import { Config } from '../config'
import { proxy } from '../microservices/proxy'

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

export interface Options {
    method?: Method
    id?: string
    body?: JsonType
    interaction: Interaction
}

export const getData = async (oid: string, options: Options): Promise<JsonType>  => {
    if (Config.ADAPTER.MODE === AdapterMode.DUMMY) {
        return Promise.resolve({ success: true, value: 100, object: oid, interaction: options.interaction })
    } else {
        if (options.interaction === Interaction.DISCOVERY) {
            return proxy.retrieveDiscovery(oid, options.body)
        } else {
            if (options.id && options.method) {
                return proxy.retrieveInteraction(oid, options.id, options.method, options.interaction, options.body)
            } else {
                return Promise.resolve({ success: false, message: 'Missing parameters' })
            }
        }
    }    
}
