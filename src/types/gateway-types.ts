// Gateway response types

import { JsonType } from './misc-types'

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
export interface ConsumptionResponse<T = JsonType> {
    error: boolean
    statusCode: number
    statusCodeReason: string
    contentType: string
    message: T[]
}

export interface RegistrationResult {
    error: boolean
    message: [{
        oid: string
        password: string | null
        name: string
        error?: boolean
    }] 
}

export interface RegistrationUpdateResult {
    error: boolean
    message: [{
        oid: string
        error?: boolean
    }]
}

export interface RegistrationResultPost {
        oid: string
        password: string | null
        name: string
        error?: boolean
}

export interface RemovalBody {
    agid: string,
    oids: string[]
}

export interface IdDiscoveryType {
    objects: { oid: string }[]
}
