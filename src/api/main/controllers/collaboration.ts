// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler } from '../../../utils'
import { responseBuilder } from '../../../utils/response-builder'

// Other imports
import { discovery } from '../../../core/collaboration'
import { security } from '../../../core/security'
import { WholeContractType, CommunityType } from '../../../types/misc-types'

type getPartnersCtrl = expressTypes.Controller<{}, {}, {},  string[] , {}>
 
export const getPartners: getPartnersCtrl = async (_req, res) => {
        try {
                const partners = await discovery.getPartners()
                return responseBuilder(HttpStatusCode.OK, res, null, partners)
        } catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(error.status, res, error.message)
        }
}

type getPartnerInfoCtrl = expressTypes.Controller<{cid: string}, {}, {}, {name: string, nodes: string[]}, {}>
 
export const getPartnerInfo: getPartnerInfoCtrl = async (req, res) => {
        const { cid } = req.params
        try {
                const partnerInfo = await discovery.getPartnerInfo(cid)
                return responseBuilder(HttpStatusCode.OK, res, null, partnerInfo)
        } catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(error.status, res, error.message)
        }
}

type getContractCtrl = expressTypes.Controller<{ cid: string }, {}, {}, WholeContractType, {}>
 
export const getContract: getContractCtrl = async (req, res) => {
    const { cid } = req.params
    try {
        const result = await security.getContract(cid)
        return responseBuilder(HttpStatusCode.OK, res, null, result)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type getCommunitiesCtrl = expressTypes.Controller<{}, {}, {}, CommunityType[], {}>
 
export const getCommunities: getCommunitiesCtrl = async (_req, res) => {
    try {
        const result = await discovery.getCommunities()
        return responseBuilder(HttpStatusCode.OK, res, null, result)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

type delContractCtrl = expressTypes.Controller<{ id: string }, {}, {}, string, {}>
 
export const delContract: delContractCtrl = async (req, res) => {
    const { id } = req.params
    try {
        const ctid = (await security.getContract(id)).ctid
        if (ctid && ctid !== 'NOT_EXISTS') {
            await security.delContract({ cid: id, ctid })
            return responseBuilder(HttpStatusCode.OK, res, null, 'Contract with ' + id + ' was removed')
        } else {
            logger.warn('Contract with organisation ' + id + ' does not exist, not removing...')
            // Return 202, accepted but not acted upon...
            return responseBuilder(HttpStatusCode.ACCEPTED, res, null, 'Contract with ' + id + ' was NOT removed')
        }
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}
