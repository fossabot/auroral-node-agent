// Controller common imports
import { expressTypes } from '../../types/index'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger } from '../../utils/logger'
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
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}
 
export const setProperty: PropertyCtrl = async (req, res) => {
  const { id, pid } = req.params
	try {
    logger.info('Requested UPDATE property ' + pid + ' from ' + id)
    return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
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
          logger.error(err.message)
          return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
      }
  }
