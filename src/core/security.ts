import { RelationshipType } from '../types/misc-types'
import { gateway } from '../microservices/gateway'
import { redisDb } from '../persistance/redis'
import { registrationFuncs } from '../persistance/models/registrations'
import { logger } from '../utils'

export const security = {
    getRelationship: async (id: string): Promise<RelationshipType> => {
        const relationship = await redisDb.get('relationship_' + id)
        if (relationship) {
            logger.debug('Getting relationship from cache')
            return relationship as RelationshipType
        } else {
            const rel = await gateway.getRelationship(id)
            if (rel.message) {
                security.cacheRelationship(id, rel.message)
                return rel.message
            } else {
                // If undefined assume highest restriction
                return RelationshipType.OTHER
            }
        }
    },
    getItemsPrivacy: async (id?: string) => {
        // TBD handle if privacy not available
        return registrationFuncs.getPrivacy(id)
    },
    cacheRelationship: async (id: string, rel: string) => {
        // Caching with TTL 300s = 5 min
        redisDb.caching('relationship_' + id, rel, 300)
    },
    cacheItemsPrivacy: async (): Promise<void> => {
        const items = await gateway.getItemsPrivacy()
        await registrationFuncs.setPrivacy(items.message)
    }
}
