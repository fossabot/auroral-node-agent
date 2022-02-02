// Controller common imports
import { expressTypes } from '../../types/index'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger, errorHandler } from '../../utils'
import { responseBuilder } from '../../utils/response-builder'

// Other imports
import { JsonType } from '../../types/misc-types'
import { PermissionLocals } from '../../types/locals-types'
import { Data } from '../../core/data'
import { Config } from '../../config'

// Controllers

type PropertyCtrl = expressTypes.Controller<{ oid: string, pid: string }, any, {}, { wrapper: JsonType }, PermissionLocals>
 
export const getProperty: PropertyCtrl = async (req, res) => {
  const { oid, pid } = req.params
  const { originId } = res.locals
	try {
    logger.info('Requested READ property ' + pid + ' from ' + oid)
    const data = await Data.readProperty(oid, pid)
    return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
	} catch (err) {
    const error = errorHandler(err)
    logger.error(error.message)
    return responseBuilder(error.status, res, error.message)
	}
}
 
export const setProperty: PropertyCtrl = async (req, res) => {
  const { oid, pid } = req.params
  const body = req.body.wrapper
  const { originId } = res.locals
	try {
    logger.info('Requested UPDATE property ' + pid + ' from ' + oid)
    const data = await Data.updateProperty(oid, pid, body)
    return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
	} catch (err) {
    const error = errorHandler(err)
		logger.error(error.message)
		return responseBuilder(error.status, res, error.message)
	}
}

type EventCtrl = expressTypes.Controller<{ oid: string, eid: string }, { body: JsonType }, {}, {}, {}>

export const receiveEvent: EventCtrl = async (req, res) => {
    const { oid, eid } = req.params
    const  body  = req.body
      try {
        logger.info('Event received to ' + oid + ' from channel ' + eid)
        await Data.receiveEvent(oid, eid, body)     
        return responseBuilder(HttpStatusCode.OK, res, null, {})
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

type DiscoveryCtrl = expressTypes.Controller<{ oid: string }, { sparql: string } | undefined, {}, { wrapper: JsonType }, PermissionLocals>

export const discovery: DiscoveryCtrl = async (req, res) => {
    const { oid } = req.params
    console.log(req.body)
    const query = req.body ? req.body.sparql : undefined // Gateway sends the sparql wrapped as a JSON
    const { relationship, items } = res.locals
    const { originId } = res.locals
    if (!Config.WOT.ENABLED) {
      throw new Error('Remote Node does not support semantic discovery...')
    }
    try {
      let data
      if (!query) {
        logger.info('Received TD discovery to ' + oid)
        data = await Data.tdDiscovery(oid, originId, relationship, items)
      } else {
        if (typeof query !== 'string') {
          return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Sparql query has to be a string')
        }
        logger.info('Received Sparql discovery to ' + oid)
        logger.debug(query)
        data = await Data.sparqlDiscovery(oid, originId, relationship, query, items)
      }
      return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
    } catch (err) {
      const error = errorHandler(err)
      logger.error(error.message)
      return responseBuilder(error.status, res, error.message)
    }
}
