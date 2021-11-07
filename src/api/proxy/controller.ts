// Controller common imports
import { expressTypes } from '../../types/index'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger, errorHandler } from '../../utils'
import { responseBuilder } from '../../utils/response-builder'

// Other imports
import { JsonType } from '../../types/misc-types'
import { PermissionLocals } from '../../types/locals-types'
import { getData, Method, Interaction } from '../../core/proxy'

// Controllers

type PropertyCtrl = expressTypes.Controller<{ id: string, pid: string }, {}, {}, JsonType, {}>
 
export const getProperty: PropertyCtrl = async (req, res) => {
  const { id, pid } = req.params
	try {
    logger.info('Requested READ property ' + pid + ' from ' + id)
    const data = await getData(id, { method: Method.GET, interaction: Interaction.PROPERTY, id: pid })
    return responseBuilder(HttpStatusCode.OK, res, null, data)
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
    const data = await getData(id, { method: Method.PUT, interaction: Interaction.PROPERTY, id: pid })
    return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
    const error = errorHandler(err)
		logger.error(error.message)
		return responseBuilder(error.status, res, error.message)
	}
}

type EventCtrl = expressTypes.Controller<{ id: string, eid: string }, { body: JsonType }, {}, JsonType, {}>

export const receiveEvent: EventCtrl = async (req, res) => {
    const { id, eid } = req.params
    const { body } = req.body
      try {
      logger.info('Received event ' + eid + ' from ' + id)
      logger.info(body)
      const data = await getData(id, { method: Method.GET, interaction: Interaction.EVENT, id: eid })
      return responseBuilder(HttpStatusCode.OK, res, null, data)
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

type DiscoveryCtrl = expressTypes.Controller<{ id: string }, { sparql: string }, {}, JsonType, PermissionLocals>

export const discovery: DiscoveryCtrl = async (req, res) => {
    const { id } = req.params
    const { sparql } = req.body
    const { relationship, items } = res.locals
      try {
        if (sparql) {
          logger.info('Received discovery to ' + id)
        } else {
          logger.info('Received Sparql discovery to ' + id)
          logger.debug(sparql)
        }
        const data = await getData(id, { interaction: Interaction.DISCOVERY, sparql }, relationship, items)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }
