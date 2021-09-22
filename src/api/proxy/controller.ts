// Controller common imports
import { expressTypes } from '../../types/index'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger, errorHandler } from '../../utils'
import { responseBuilder } from '../../utils/response-builder'

// Other imports
import { JsonType } from '../../types/misc-types'

// Controllers

type PropertyCtrl = expressTypes.Controller<{ id: string, pid: string }, {}, {}, null, {}>
 
export const getProperty: PropertyCtrl = async (req, res) => {
  const { id, pid } = req.params
	try {
    logger.info('Requested READ property ' + pid + ' from ' + id)
    return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
    const error = errorHandler(err)
    logger.error(error.message)
    return responseBuilder(error.status, res, error.message)
	}
}
 
export const setProperty: PropertyCtrl = async (req, res) => {
  const { id, pid } = req.params
	try {
    logger.info('Requested UPDATE property ' + pid + ' from ' + id)
    return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
    const error = errorHandler(err)
		logger.error(error.message)
		return responseBuilder(error.status, res, error.message)
	}
}

type EventCtrl = expressTypes.Controller<{ id: string, eid: string }, { body: JsonType }, {}, null, {}>

export const receiveEvent: EventCtrl = async (req, res) => {
    const { id, eid } = req.params
    const { body } = req.body
      try {
      logger.info('Received event ' + eid + ' from ' + id)
      logger.info(body)
      return responseBuilder(HttpStatusCode.OK, res, null, null)
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

type DiscoveryCtrl = expressTypes.Controller<{ id: string }, { sparql: JsonType }, {}, JsonType, {}>

export const discovery: DiscoveryCtrl = async (req, res) => {
    const { id } = req.params
    const { sparql } = req.body
      try {
        logger.info('Received discovery to ' + id)
        logger.info(sparql)
        const dummyResp: JsonType = { success: true }
        return responseBuilder(HttpStatusCode.OK, res, null, dummyResp)
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }
