// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler } from '../../../utils'
import { responseBuilder } from '../../../utils/response-builder'

// Other imports
import { gateway } from '../../../microservices/gateway'

// Controllers

type loginCtrl = expressTypes.Controller<{ id?: string }, {}, {}, string, {}>

/**
 * Login endpoint
 * @param {string} id [OPTIONAL - If absent use gateway OID]
 */
export const login: loginCtrl = async (req, res) => {
  const { id } = req.params
	try {
    const data = await gateway.login(id)
    return responseBuilder(HttpStatusCode.OK, res, null, data.statusCodeReason)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        // Harcoded response message, TBD fix in gateway
        return responseBuilder(error.status, res, error.message)
	}
}
 
type logoutCtrl = expressTypes.Controller<{ id?: string }, {}, {}, string, {}>

/**
 * Logout endpoint
 * @param {string} id [OPTIONAL - If absent use gateway OID]
 */
export const logout: logoutCtrl = async (req, res) => {
  const { id } = req.params
	try {
    const data = await gateway.logout(id)
    return responseBuilder(HttpStatusCode.OK, res, null, data.statusCodeReason)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        // Harcoded response message, TBD fix in gateway
        return responseBuilder(error.status, res, error.message)
	}
}
