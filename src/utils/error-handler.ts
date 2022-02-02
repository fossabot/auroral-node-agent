/**
 * Error handler
 */

import { HttpStatusCode } from './http-status-codes'
import { logger } from './logger'

export enum ErrorSource {
    UNKNOWN = 'unknown',
    ITEM = 'item',
    USER = 'user',
    NODE = 'node',
    CONTRACT = 'contract',
    ORGANISATION = 'organisation',
}

type ErrorOptions = {
    stack?: string,
    source?: ErrorSource
}

export class MyError {
    message: string
    status: HttpStatusCode
    stack?: string
    source?: ErrorSource
    constructor(message: string, status: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR, options?: ErrorOptions) {
        this.message = message
        this.status = status
        this.stack = options?.stack
        this.source = options?.source
    }
}

export const errorHandler = (err: unknown): MyError => {
    if (err instanceof MyError) {
        return err
    } else if (err instanceof Error) {
        return {
            status: HttpStatusCode.INTERNAL_SERVER_ERROR,
            message: err.message,
            source: ErrorSource.UNKNOWN
        }
    } else {
        logger.warn('Caught unexpected error type...')
        logger.warn('Error type: ' + typeof err)
        return {
            status: HttpStatusCode.INTERNAL_SERVER_ERROR,
            message: 'Server error',
            source: ErrorSource.UNKNOWN
        }
    }
}

