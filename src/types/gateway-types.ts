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

export interface RegistrationResult {
    error: boolean
    message: [{
        oid: string
        password: string | null
        name: string
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
