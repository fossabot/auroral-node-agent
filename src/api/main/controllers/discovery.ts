// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler } from '../../../utils'
import { responseBuilder } from '../../../utils/response-builder'

// Other imports
import { ContractItemType, JsonType } from '../../../types/misc-types'
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
    export const getOrganisationItems: organisationItemsCtrl = async (_req, res) => {
        try {
            const data = (await gateway.organisationItems()).message
            return responseBuilder(HttpStatusCode.OK, res, null, data)
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return responseBuilder(error.status, res, error.message)
        }
    }

type getContractItemsCtrl = expressTypes.Controller<{ ctid: string, oid?: string }, {}, {}, ContractItemType[], {}>

/**
 * Discovery endpoint LOCAL
 * Check what items can you see in a contract
 */
    export const getContractItems: getContractItemsCtrl = async (req, res) => {
    const { ctid, oid } = req.params
        try {
            if (oid) {
                return responseBuilder(HttpStatusCode.OK, res, null, (await gateway.contractItemsByOwner(ctid, oid)).message)
            } else {
                return responseBuilder(HttpStatusCode.OK, res, null, (await gateway.contractItems(ctid)).message)
            }
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            return responseBuilder(error.status, res, error.message)
        }
    }

type discoveryLocalTdCtrl = expressTypes.Controller<{ oid: string }, {}, {}, Thing | string, {}>
 
export const discoverLocalTd: discoveryLocalTdCtrl = async (req, res) => {
    const { oid } = req.params
    try {
        let result
        if (Config.WOT.ENABLED) {
                result = (await wot.retrieveTD(oid)).message
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

type discoveryRemoteCtrl = expressTypes.Controller<{ agid: string }, string | undefined, { query?: string }, Registration[] | Thing[], {}>

/**
 * Used by WOT federative calls
 * returning without wrapper
 * @param req 
 * @param res 
 * @returns 
 */
 export const discoveryRemote: discoveryRemoteCtrl = async (req, res) => {
    const { agid } = req.params
    const sparql = req.query.query
    try {
        const params = { sparql }
        const data = await gateway.discoveryRemote(agid, params)
        if (data.error) {
            const response: string = data.statusCodeReason
            logger.warn('Discovery failed')
            return responseBuilder(data.statusCode, res, response)
          } else {
            try {
                const response = data.message[0].message.wrapper.message
                // Return without wrapping
                return res.status(200).json(response)
            } catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Destination Node could not parse the Sparql query, please revise syntax')
            }
          } 
      } catch (err) {
        logger.warn('AGID:' + agid + ' not reachable')
        // return empty triplet
        const empty = {
            'head': {
              'vars': [
                'sub',
                'pred',
                'obj',
              ]
            },
            'results': {
              'bindings': []
            }
          }
        return res.status(200).json(empty)
      }
}

type discoveryTdRemoteCtrl = expressTypes.Controller<{ agid: string }, string | undefined, { oids?: string }, Thing[], {}>

 export const discoveryTdRemote: discoveryTdRemoteCtrl = async (req, res) => {
    const { agid } = req.params
    const oids = req.query.oids
    try {
        if (!oids) {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing oids')
        }
        const data = await gateway.discoveryRemote(agid, { sparql: undefined, oids })
        if (data.error) {
            const response: string = data.statusCodeReason
            logger.warn('Discovery failed')
            return responseBuilder(data.statusCode, res, response)
          } else {
            try {
                const response = data.message[0].message.wrapper
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

type federativeDiscoveryRemoteCtrl = expressTypes.Controller<{ }, string, { agids: string }, JsonType, {}>

export const discoveryFederative: federativeDiscoveryRemoteCtrl = async (req, res) => {
    const sparql = req.body
    const agids = req.query.agids
    try {
        if (!agids) {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing agids')
        }
        if (!sparql) {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing sparql query')
        }
        // build URL to ask remote WOT
        const urls = agids.split(',').map((agid) => 'http://auroral-agent:4000/api/discovery/remote/semantic/' + agid)
        const data = await wot.searchFederativeSPARQL(sparql, urls)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
}

type federativeCommunityDiscoveryCtrl = expressTypes.Controller<{ commid: string }, string, {}, JsonType, {}>

export const discoveryCommunityFederative: federativeCommunityDiscoveryCtrl = async (req, res) => {
    const sparql = req.body
    const { commid } = req.params
    try {
        if (!commid) {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing agids')
        }
        if (!sparql) {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Missing sparql query')
        }
        // build URL to ask remote WOT
        const communityInfo = (await gateway.communityNodes(commid)).message
        if (communityInfo.length === 0) {
            return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'There are no nodes in this community')
        }
        const agids = communityInfo.map((node) => node.agid)
        console.log(`AGIDS: ${agids}`)
        const urls = agids.map((agid) => 'http://auroral-agent:4000/api/discovery/remote/semantic/' + agid)
        const data = await wot.searchFederativeSPARQL(sparql, urls)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
      } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
      }
}
