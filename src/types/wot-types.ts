// WoT response types

import { JsonType } from './misc-types'

export interface BasicResponse {
    error: boolean
    message?: string | JsonType | JsonType[]
}
