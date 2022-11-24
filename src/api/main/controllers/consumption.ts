// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler, MyError } from '../../../utils'
import { responseBuilder } from '../../../utils/response-builder'

// Other imports
import { JsonType } from '../../../types/misc-types'
import { gateway } from '../../../microservices/gateway'
import { GatewayResponse } from '../../../types/gateway-types'
import { useMapping } from '../../../core/mapping'
import { Config } from '../../../config'
import { checkODRLPolicy } from '../../../core/odrl'
import { checkSHACL } from '../../../core/shacl'

// ***** Consume remote resources *****

type getPropertyCtrl = expressTypes.Controller<{ id: string, oid: string, pid: string }, {}, JsonType, any, {}>

/**
 * Request remote property
 */
 export const getProperty: getPropertyCtrl = async (req, res) => {
    const { id, oid, pid } = req.params
    const reqParams = req.query
      try {
        await checkODRLPolicy(oid, pid, reqParams)
        await checkSHACL(oid, pid)
        const data = await gateway.getProperty(id, oid, pid, reqParams)
        // Parse response to get only the final payload
        if (data.error) {
          const response: string = data.statusCodeReason
          logger.warn(`Property ${pid} of ${oid} could not be retrieved`)
          return responseBuilder(data.statusCode, res, response)
        } else {
          const response = data.message[0].message.wrapper
          logger.debug(`Property ${pid} of ${oid} received`)
          return responseBuilder(HttpStatusCode.OK, res, null, response)
        }      
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

type setPropertyCtrl = expressTypes.Controller<{ id: string, oid: string, pid: string }, JsonType, JsonType, GatewayResponse, {}>

/**
 * Set remote property
 */
export const setProperty: setPropertyCtrl = async (req, res) => {
    const { id, oid, pid } = req.params
    const body = req.body
    const reqParams = req.query
    try {
      await checkODRLPolicy(oid, pid, reqParams)
      await checkSHACL(oid, pid)
      if (!body) {
        logger.warn('Missing body')
        return responseBuilder(HttpStatusCode.BAD_REQUEST, res, null)
      }
      const data = await gateway.putProperty(id, oid, pid, body, reqParams)
      // Parse response to get only the final payload
      if (data.error) {
        const response: string = data.statusCodeReason
        logger.warn(`Property ${pid} of ${oid} could not be set`)
        return responseBuilder(data.statusCode, res, response)
      } else {
        const response = data.message[0].message.wrapper
        logger.debug(`Property ${pid} of ${oid} set`)
        return responseBuilder(HttpStatusCode.OK, res, null, response)
      }      
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type getEventChannelsCtrl = expressTypes.Controller<{ id: string, oid: string }, {}, {}, JsonType[], {}>

/**
 * Create event channel
 */
export const getEventChannels: getEventChannelsCtrl = async (req, res) => {
    const { id, oid } = req.params
    try {
      const data = await gateway.getObjectEventChannels(id, oid)
      _parse_gtw_response(data)
      logger.info(`Channels of ${oid} retrieved`)
      return responseBuilder(HttpStatusCode.OK, res, null, data.message)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type activateEventChannelCtrl = expressTypes.Controller<{ id: string, eid: string }, {}, {}, string, {}>

/**
 * Create event channel
 */
export const activateEventChannel: activateEventChannelCtrl = async (req, res) => {
    const { id, eid } = req.params
    try {
      const data = await gateway.activateEventChannel(id, eid)
      _parse_gtw_response(data)
      logger.info(`Channel ${eid} of ${id} activated`)
      return responseBuilder(HttpStatusCode.OK, res, null, data.statusCodeReason)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type publishEventCtrl = expressTypes.Controller<{ id: string, eid: string }, string, {}, string, {}>

/**
 * Publish event to channel
 */
    export const publishEvent: publishEventCtrl = async (req, res) => {
    const { id, eid } = req.params
    const body = req.body
    try {
        if (!body) {
          logger.warn('Missing body')
          return responseBuilder(HttpStatusCode.BAD_REQUEST, res, null)
        } 
        // JSON parse 
        let parsedBody 
        try {
          parsedBody = JSON.parse(body)
        } catch (error) {
          parsedBody = body
        }
        // do mappings if enabled
        const toSend = Config.WOT.ENABLED && Config.ADAPTER.USE_MAPPING ? await useMapping(id, eid, parsedBody) : parsedBody
        const data = await  gateway.publishEvent(id, eid, { wrapper: toSend })
        _parse_gtw_response(data)
        logger.info(`Message sent to channel ${eid} of ${id}`)
        return responseBuilder(HttpStatusCode.OK, res, null, data.statusCodeReason)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type deactivateEventChannelCtrl = expressTypes.Controller<{ id: string, eid: string }, {}, {}, string, {}>

/**
 * Deactivate event channel
 */
export const deactivateEventChannel: deactivateEventChannelCtrl = async (req, res) => {
    const { id, eid } = req.params
    try {
      const data = await gateway.deactivateEventChannel(id, eid)
      _parse_gtw_response(data)
      logger.info(`Channel ${eid} of ${id} deactivated`)
      return responseBuilder(HttpStatusCode.OK, res, null, data.statusCodeReason)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type statusRemoteEventChannelCtrl = expressTypes.Controller<{ id: string, oid: string, eid: string }, {}, {}, string, {}>

/**
 * Status of remote event channel
*/
export const statusRemoteEventChannel: statusRemoteEventChannelCtrl = async (req, res) => {
    const { id, oid, eid } = req.params
    try {
      const data = await gateway.statusRemoteEventChannel(id, oid, eid)
      _parse_gtw_response(data)
      logger.info(`Get status of remote channel ${eid} of ${oid}`)
      return responseBuilder(HttpStatusCode.OK, res, null, data.message as unknown as string)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type subscribeRemoteEventChannelCtrl = expressTypes.Controller<{ id: string, oid: string, eid: string }, {}, {}, string, {}>

/**
 * Subscribe remote event channel
*/
export const subscribeRemoteEventChannel: subscribeRemoteEventChannelCtrl = async (req, res) => {
    const { id, oid, eid } = req.params
    try {
      const data = await gateway.subscribeRemoteEventChannel(id, oid, eid)
      _parse_gtw_response(data)
      logger.info(`Subscribed to remote channel ${eid} of ${oid}`)
      return responseBuilder(HttpStatusCode.OK, res, null, data.statusCodeReason)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type unsubscribeRemoteEventChannelCtrl = expressTypes.Controller<{ id: string, oid: string, eid: string }, {}, {}, string, {}>

/**
 * Unsubscribe remote event channel
 */
export const unsubscribeRemoteEventChannel: unsubscribeRemoteEventChannelCtrl = async (req, res) => {
    const { id, oid, eid } = req.params
    try {
        const data = await gateway.unsubscribeRemoteEventChannel(id, oid, eid)
        _parse_gtw_response(data)
        logger.info(`Unsubscribed to remote channel ${eid} of ${oid}`)
        return responseBuilder(HttpStatusCode.OK, res, null, data.statusCodeReason)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

// Private functions

const _parse_gtw_response = (data: GatewayResponse): void => {
  if (data.statusCode >= 500) {
    throw new MyError(data.statusCodeReason, HttpStatusCode.INTERNAL_SERVER_ERROR)
  } else if (data.statusCode === 400) {
    throw new MyError(data.statusCodeReason, HttpStatusCode.BAD_REQUEST)
  } else if (data.statusCode === 401) {
    throw new MyError(data.statusCodeReason, HttpStatusCode.UNAUTHORIZED)
  } else if (data.statusCode === 404) {
    throw new MyError(data.statusCodeReason, HttpStatusCode.NOT_FOUND)
  }  else if (data.statusCode > 400) {
    throw new MyError(data.statusCodeReason, HttpStatusCode.INTERNAL_SERVER_ERROR)
  } 
}
