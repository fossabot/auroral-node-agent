// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler } from '../../../utils'
import { responseBuilder } from '../../../utils/response-builder'

// Other imports
import { JsonType } from '../../../types/misc-types'
import { Registration } from '../../../persistance/models/registrations'
import { gateway } from '../../../microservices/gateway'
import { wot } from '../../../microservices/wot'
import { Config } from '../../../config'
import { Thing } from '../../../types/wot-types'
import { NodeType } from '../../../types/gateway-types'

type discoveryCtrl = expressTypes.Controller<{ id?: string }, {}, {}, string[], {}>

/**
 * Discovery endpoint LOCAL
 * Check what remote objects can you see
 * Returns array of OIDs
 */
 export const discoveryLocal: discoveryCtrl = async (req, res) => {
    const { id } = req.params
      try {
      const data = await gateway.discovery(id)
      const result = data.objects.map(it => it.oid)
      // TBD: Filter out system objects
      return responseBuilder(HttpStatusCode.OK, res, null, result)
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

type orgNodesCtrl = expressTypes.Controller<{ cid?: string }, {}, {}, NodeType[], {}>

/**
 * Discovery endpoint LOCAL
 * Check what nodes can you see in a certain organisation
 */
export const getOrganisationNodes: orgNodesCtrl = async (req, res) => {
    const { cid } = req.params
    try {
        const data = (await gateway.organisationNodes(cid)).message
        return responseBuilder(HttpStatusCode.OK, res, null, data)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type communityNodesCtrl = expressTypes.Controller<{ commid: string }, {}, {}, NodeType[], {}>

/**
 * Discovery endpoint LOCAL
 * Check what nodes can you see in a community
 */
    export const getCommunityNodes: communityNodesCtrl = async (req, res) => {
    const { commid } = req.params
        try {
            const data = (await gateway.communityNodes(commid)).message
            return responseBuilder(HttpStatusCode.OK, res, null, data)
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return responseBuilder(error.status, res, error.message)
        }
    }

type organisationItemsCtrl = expressTypes.Controller<{}, {}, {}, string[], {}>

/**
 * Discovery endpoint LOCAL
 * Check what remote items can you see in an organisation
 */
    export const getOrganisationItems: organisationItemsCtrl = async (req, res) => {
        try {
            const data = (await gateway.organisationItems()).message
            return responseBuilder(HttpStatusCode.OK, res, null, data)
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return responseBuilder(error.status, res, error.message)
        }
    }

type getContractItemsCtrl = expressTypes.Controller<{ ctid: string }, {}, {}, string[], {}>

/**
 * Discovery endpoint LOCAL
 * Check what items can you see in a contract
 */
    export const getContractItems: getContractItemsCtrl = async (req, res) => {
    const { ctid } = req.params
        try {
            const data = (await gateway.contractItems(ctid)).message
            return responseBuilder(HttpStatusCode.OK, res, null, data)
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return responseBuilder(error.status, res, error.message)
        }
    }

type discoveryLocalTdCtrl = expressTypes.Controller<{ id: string }, {}, {}, Thing | string, {}>
 
export const discoverLocalTd: discoveryLocalTdCtrl = async (req, res) => {
    const { id } = req.params
    try {
        let result
        if (Config.WOT.ENABLED) {
                result = (await wot.retrieveTD(id)).message
        } else {
                result = 'You need to enable WoT to use this function'
        }
        return responseBuilder(HttpStatusCode.OK, res, null, result)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type discoveryLocalSemanticCtrl = expressTypes.Controller<{}, string, {}, JsonType | string, {}>
 
export const discoverLocalSemantic: discoveryLocalSemanticCtrl = async (req, res) => {
    const sparql =  req.body
    try {
        let result
        if (!sparql) {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing sparql query')
        } else if (Config.WOT.ENABLED) {
            result = (await wot.searchSPARQL(sparql)).message
        } else {
            result = 'You need to enable WoT to use this function'
        }
        return responseBuilder(HttpStatusCode.OK, res, null, result)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type discoveryRemoteCtrl = expressTypes.Controller<{ id: string, originId?: string }, string | undefined, {}, Registration[] | Thing[], {}>

/**
 * Discovery endpoint REMOTE
 * Check what remote objects can you see and fetch TDs (and data??)
 * If no originId, it is assumed that you originate the call from your GATEWAY
 * (Gateways can only reach other gateways, while items might see other items)
 */
 export const discoveryRemote: discoveryRemoteCtrl = async (req, res) => {
    const { id, originId } = req.params
    const sparql = req.body  
    try {
        const params = { sparql, originId }
        const data = await gateway.discoveryRemote(id, params)
        if (data.error) {
            const response: string = data.statusCodeReason
            logger.warn('Discovery failed')
            return responseBuilder(data.statusCode, res, response)
          } else {
            try {
                const response = data.message[0].message.wrapper.message
                return responseBuilder(HttpStatusCode.OK, res, null, response)
            } catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Destination Node could not parse the Sparql query, please revise syntax')
            }
          } 
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
  }

