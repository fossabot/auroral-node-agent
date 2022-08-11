/**
 * Error handler
 */

import { HTTPError } from 'got/dist/source'
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
    try {
        if (err instanceof MyError) {
            return err
        } else if (err instanceof HTTPError) {
            return {
                message: (err.response.body as { statusCodeReason: string }).statusCodeReason,
                status: err.response.statusCode,
            } 
        } else if (err instanceof Error) {
             return {
                ...err, // Workaround for ErrnoException type (code, path, syscall, stack, ...)
                message: err.message,
                status: HttpStatusCode.INTERNAL_SERVER_ERROR
             }
         }
        throw new Error('Unknown error')
    } catch {
        logger.warn('Caught unexpected error type...')
        logger.warn('Error type: ' + typeof err)
        return {
            message: 'Server error',
            status: HttpStatusCode.INTERNAL_SERVER_ERROR
        }
    }
}

