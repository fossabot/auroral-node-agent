import { NextFunction, Request, Response } from 'express'

export interface CustomRequestObject<P extends {} = {}, B extends {} = {}, Q extends {} = {} > extends Request {
	params: P,
	body: B,
	query: Q
}

export interface CustomResponseObject<L extends {} = {}> extends Response {
	locals: L
}

type ControllerReturnType<T> = ApiResponse<T> | Promise<ApiResponse<T>> | ReturnType<NextFunction>

// For now lets just agree to use the interface, latter we can maybe create factory for controllers or something like that
export interface Controller<ReqParams = {}, ReqBody = {}, ReqQuery = {}, Result = null, ResLocals = {}> {
	(req: CustomRequestObject<ReqParams, ReqBody, ReqQuery>, res: CustomResponseObject<ResLocals>, next: NextFunction): ControllerReturnType<Result>
}

export type ApiResponse<T> = Response<{
    error: string | null
    message?: T
}>
