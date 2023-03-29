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
           if (err.response) {
            try {
                // Simple string in body
                return {
                    message: JSON.parse(err.response.body as string),
                    status: err.response.statusCode,
                }
            } catch {
                // Advanced body with statusCode and statusCodeReason
                logger.warn('Caught HTTPError without JSON response...')
                const body = err.response.body as { statusCode: HttpStatusCode, statusCodeReason: string }
                return {
                    message: body.statusCodeReason,
                    status: body.statusCode,
                } 
            }
            } else {
                logger.warn('Caught HTTPError without response...')
                return {
                    message: err.message,
                    status: HttpStatusCode.INTERNAL_SERVER_ERROR,
            }
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
        logger.warn('Caught unexpected error type (' + typeof Error + ')...')
        logger.error(err)
        return {
            message: 'Server error',
            status: HttpStatusCode.INTERNAL_SERVER_ERROR
        }
    }
}

