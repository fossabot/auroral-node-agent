import { ApiResponse } from '../types/express-types'
import { HttpStatusCode } from './http-status-codes'

// Default errors based on status codes, just an example we can create/modify latter
function errorBuilder(statusCode: HttpStatusCode, errorMessage?: string | null) {
    if (errorMessage) {
        return errorMessage
    }
    switch (statusCode) {
        case HttpStatusCode.INTERNAL_SERVER_ERROR:
            return 'Ooops something went wrong!'
        case HttpStatusCode.BAD_REQUEST:
            return 'Bad request'
        case HttpStatusCode.TOO_MANY_REQUESTS:
            return 'Request quota exceeded, please wait before sending next request'
        case HttpStatusCode.NOT_FOUND:
            return 'Requested resource was not found'
        case HttpStatusCode.FORBIDDEN:
            return 'Missing authorization to access requested resource'
        default:
            return null
    }
}

export function responseBuilder<T>(statusCode: HttpStatusCode, res: ApiResponse<T>, error?: string | null, message?: T) {
    const err = errorBuilder(statusCode, error)
    if (err) {
        return res.status(statusCode).json({
            error: err,
            message,
            statusCode
        })
    } else {
        return res.status(statusCode).json({
            message,
            statusCode
        })
    }
}
