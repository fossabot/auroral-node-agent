/**
 * Error handler
 */

 import { HttpStatusCode } from './http-status-codes'
 import { logger } from './logger'

 type CustomError = {
     message: string,
     status: HttpStatusCode,
     stack?: string,
     code?: string,
     path?: string,
     syscall?: string
 }
 
 export enum ErrorType {
     WRONG_BODY = 'Wrong body',
     UNAUTHORIZED = 'Unauthorized',
     NOT_FOUND = 'Not found'
 }
 
 export const errorHandler = (err: unknown): CustomError => {
     if (err instanceof Error) {
         return {
            ...err, // Workaround for ErrnoException type (code, path, syscall, stack, ...)
            message: err.message,
            status: getStatus(err.message)
         }
     } else {
         logger.warn('Caught unexpected error type...')
         logger.warn('Error type: ' + typeof err)
         return {
             message: 'Server error',
             status: HttpStatusCode.INTERNAL_SERVER_ERROR
         }
     }
 }
 
 // Private functions
 
 const getStatus = (key: string): HttpStatusCode => {
     switch (key) {
         case ErrorType.NOT_FOUND:
             return HttpStatusCode.NOT_FOUND
         case ErrorType.UNAUTHORIZED:
             return HttpStatusCode.UNAUTHORIZED
         case ErrorType.WRONG_BODY:
             return HttpStatusCode.BAD_REQUEST
         default:
             return HttpStatusCode.INTERNAL_SERVER_ERROR
     }
 }
 
