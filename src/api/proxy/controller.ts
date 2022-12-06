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
import { checkODRLPolicy } from '../../core/odrl'
import { checkSHACL } from '../../core/shacl'

// Controllers

type PropertyCtrl = expressTypes.Controller<{ oid: string, pid: string }, any, JsonType, { wrapper: JsonType }, PermissionLocals>
 
export const getProperty: PropertyCtrl = async (req, res) => {
  const { oid, pid } = req.params
  const reqParams  = req.query
  const sourceoid = req.headers.sourceoid ? req.headers.sourceoid.toString() : 'undefined'
	try {
    await checkODRLPolicy(oid, pid, reqParams)
    logger.info('Requested READ property ' + pid + ' from ' + oid)
    const data = await Data.readProperty(oid, pid, sourceoid, reqParams)
    await checkSHACL(oid, pid, data)
    return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
	} catch (err) {
    const error = errorHandler(err)
    logger.error(error.message)
    return responseBuilder(error.status, res, error.message)
	}
}
 
export const setProperty: PropertyCtrl = async (req, res) => {
  const { oid, pid } = req.params
  const body = req.body
  const reqParams  = req.query
  const sourceoid = req.headers.sourceoid ? req.headers.sourceoid.toString() : 'undefined'
	try {
    await checkODRLPolicy(oid, pid, reqParams)
    logger.info('Requested UPDATE property ' + pid + ' from ' + oid)
    const data = await Data.updateProperty(oid, pid, sourceoid, body, reqParams)
    await checkSHACL(oid, pid, data)
    return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
	} catch (err) {
    const error = errorHandler(err)
		logger.error(error.message)
		return responseBuilder(error.status, res, error.message)
	}
}

type EventCtrl = expressTypes.Controller<{ oid: string, eid: string }, { wrapper: JsonType }, {}, {}, {}>

export const receiveEvent: EventCtrl = async (req, res) => {
    const { oid, eid } = req.params
    const  body  = req.body.wrapper
    const sourceoid = req.headers.sourceoid ? req.headers.sourceoid.toString() : 'undefined'
      try {
        logger.info('Event received to ' + oid + ' from channel ' + eid)
        await Data.receiveEvent(oid, eid, sourceoid, body)     
        return responseBuilder(HttpStatusCode.OK, res, null, {})
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

type DiscoveryCtrl = expressTypes.Controller<{ oid: string }, { sparql?: string, oids?: string } | undefined, {}, { wrapper: JsonType }, PermissionLocals>

export const discovery: DiscoveryCtrl = async (req, res) => {
    const { oid } = req.params
    const { relationship, items } = res.locals
    const { originId } = res.locals
    if (!Config.WOT.ENABLED) {
      throw new Error('Remote Node does not support semantic discovery...')
    }
    if (!req.body) {
      throw new Error('Not valid body. Include oids or sparql')
    }
    try {
      // SPARQL request
      if (req.body?.sparql) {
        if (typeof req.body.sparql !== 'string') {
          return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Sparql query has to be a string')
        }
        logger.info('Received Sparql discovery to ' + oid)
        const data = await Data.sparqlDiscovery(oid, originId, relationship, req.body.sparql, items) 
        return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
      }
      // TD request
      if (req.body.oids) {
        logger.info('Received TD discovery to ' + oid)
        // for all requeted oids
        const oidsArray = req.body.oids.split(',')
        const data = await Promise.all(oidsArray.map(async (objectId: string) => {
          try {
              return  { oid: objectId, success: true, td: (await Data.tdDiscovery(objectId, originId, relationship, items)).message }
          } catch {
            return { oid: objectId, success: false }
          }
        })) as JsonType
        return responseBuilder(HttpStatusCode.OK, res, null, { wrapper: data })
      }
      throw new Error('Not valid body. In clude oids or sparql')
    } catch (err) {
      const error = errorHandler(err)
      logger.error('Error while returning discovery')
      logger.error(error.message)
      return responseBuilder(error.status, res, error.message)
    }
}
