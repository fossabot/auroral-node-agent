import { RelationshipType } from '../types/misc-types'
import { gateway } from '../microservices/gateway'
import { redisDb } from '../persistance/redis'
import { logger } from '../utils'
import { Config } from '../config'

export const discovery = {
    getRelationship: async (id: string): Promise<RelationshipType> => {
        const cid = await getCid(id)
        return relationshipSwitch(cid)
    },
    getCid: async (id: string): Promise<string> => {
        return getCid(id)
    },
    getPartners: async (): Promise<string[]> => {
        return gateway.getPartners()
    },
    getPartnerInfo: async (id: string) => {
        return gateway.getPartnerInfo(id)
    },
    reloadCid: async (id: string): Promise<string> => {
        const cid = await gateway.getCid(id)
        if (id === Config.GATEWAY.ID) {
            logger.info('Caching your node CID')
            redisDb.caching('cid:' + id, cid)
            await redisDb.hset('configuration', 'cid', cid)
        }
        return cid
    },
    reloadPartners: async (): Promise<string[]> => {
        logger.info('Reloading organisation partners... ')
        const d = new Date()
        const partners = await gateway.getPartners()
        await redisDb.hset('configuration', 'partners', String(partners))
        await redisDb.hset('configuration', 'last_partners_update', d.toISOString())
        return partners
    },
    reloadPartnerInfo: async (id: string) => {
        logger.info('Reloading your organisation info... ')
        const info = await gateway.getPartnerInfo(id)
        await redisDb.hset('configuration', 'organisation', info.name)
        await redisDb.hset('configuration', 'nodes', String(info.nodes))
        return info
    }
}

// Private functions

const relationshipSwitch = async (cid: string): Promise<RelationshipType> => {
    const partners = await redisDb.hget('configuration', 'partners')
    const partnersArray = partners.split(',')
    const me = await redisDb.hget('configuration', 'cid')
    if (cid === me) {
        return RelationshipType.ME
    } else if (partnersArray.indexOf(cid)) {
        return RelationshipType.FRIEND
    } else {
        return RelationshipType.OTHER
    }
} 

const getCid = async (id: string): Promise<string> => {
    const cid = await redisDb.get('cid:' + id)
    // Check if incoming id's cid is already stored
    if (!cid) {
        const newcid = await gateway.getCid(id)
        redisDb.caching('cid:' + id, newcid)
        return newcid
    }
    return cid
}
