// Controller common imports
import { expressTypes } from '../../types/index'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger, errorHandler } from '../../utils'
import { responseBuilder } from '../../utils/response-builder'

// Other imports
import { AdapterMode, JsonType } from '../../types/misc-types'
import { PermissionLocals } from '../../types/locals-types'
import { getData, Method, Interaction } from '../../core/data'
import { Config } from '../../config'
import { proxy } from '../../microservices/proxy'

// Controllers

type PropertyCtrl = expressTypes.Controller<{ id: string, pid: string }, {}, {}, { wrapper: any }, {}>
 
export const getProperty: PropertyCtrl = async (req, res) => {
  const { id, pid } = req.params
	try {
    logger.info('Requested READ property ' + pid + ' from ' + id)
    const data = await getData(id, { method: Method.GET, interaction: Interaction.PROPERTY, id: pid })
    return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
	} catch (err) {
    const error = errorHandler(err)
    logger.error(error.message)
    return responseBuilder(error.status, res, error.message)
	}
}
 
export const setProperty: PropertyCtrl = async (req, res) => {
  const { id, pid } = req.params
  const body = req.body
	try {
    logger.info('Requested UPDATE property ' + pid + ' from ' + id)
    const data = await getData(id, { method: Method.PUT, interaction: Interaction.PROPERTY, id: pid, body })
    return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
	} catch (err) {
    const error = errorHandler(err)
		logger.error(error.message)
		return responseBuilder(error.status, res, error.message)
	}
}

type EventCtrl = expressTypes.Controller<{ id: string, eid: string }, { body: JsonType }, {}, {}, {}>

export const receiveEvent: EventCtrl = async (req, res) => {
    const { id, eid } = req.params
    const  body  = req.body
      try {
        const data = await getData(id, { method: Method.POST, interaction: Interaction.EVENT, id: eid, body: body })
        // console.log(data)
     
      return responseBuilder(HttpStatusCode.OK, res, null, {})
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

type DiscoveryCtrl = expressTypes.Controller<{ id: string }, { sparql: string }, {}, { wrapper: JsonType }, PermissionLocals>

export const discovery: DiscoveryCtrl = async (req, res) => {
    const { id } = req.params
    const { sparql } = req.body
    const { relationship, items } = res.locals
      try {
        if (!sparql) {
          logger.info('Received discovery to ' + id)
        } else {
          if (typeof sparql !== 'string') {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Sparql query has to be a string')
          }
          logger.info('Received Sparql discovery to ' + id)
          logger.debug(sparql)
        }
        const data = await getData(id, { interaction: Interaction.DISCOVERY, sparql }, relationship, items)
        logger.debug('Returning data')
        return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }
