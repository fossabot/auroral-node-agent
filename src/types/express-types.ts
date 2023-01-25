import { NextFunction, Request, Response, Locals } from 'express'
import { PermissionLocals } from './locals-types'

export interface CustomRequestObject<P extends {} = {}, B = {} | string | undefined, Q extends {} = {} > extends Request {
	params: P,
	body: B,
	query: Q
}

export interface CustomResponseObject<L extends {} = {} > extends Response {
	locals: L
}

type ControllerReturnType<T> = ApiResponse<T> | Promise<ApiResponse<T>> | ReturnType<NextFunction>

// For now lets just agree to use the interface, latter we can maybe create factory for controllers or something like that
export interface Controller<ReqParams extends {} = {}, ReqBody = {} | string | undefined, ReqQuery extends {} = {}, Result = null, ResLocals extends {} = {} > {
	(req: CustomRequestObject<ReqParams, ReqBody, ReqQuery>, res: CustomResponseObject<ResLocals>, next: NextFunction): ControllerReturnType<Result>
}

export interface ApiResponse<T> extends Response<{
    error?: string
    message?: T
	statusCode: number
} | T> {
	locals: Record<string, any> | Locals | PermissionLocals
}
