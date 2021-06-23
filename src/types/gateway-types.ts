// Gateway response types

import { JsonType } from './misc-types'

export interface BasicResponse {
    error: boolean
    message: string
}

export interface TdsResponse {
    error: boolean
    message: JsonType[]
}

export interface BasicArrayResponse {
    error: boolean
    message: string[]
}

export interface DeleteResponse {
    error: boolean
    message: {
        message: string, 
        value: string,
        result: string,
        error: string
    }[]
}

// TBD: Replace JsonType with more accurate interface
export interface ConsumptionResponse {
    error: boolean
    message: JsonType[]
}

export interface RegistrationBody {
    adapterId: string,
    name: string,
    type: string,
    version?: string,
    description?: string,
    locatedIn?: string,
    actions?: string[],
    events?: string[],
    properties?: string[]
}

export interface RemovalBody {
    agid: string,
    oids: string[]
}
