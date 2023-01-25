import { expressTypes } from '../../../types/index'
import { security } from '../../../core/security'
import { discovery } from '../../../core/collaboration'

// Other imports
import { IItemPrivacy, RelationshipType } from '../../../types/misc-types'
import { PermissionLocals } from '../../../types/locals-types'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { ItemPrivacy } from '../../../persistance/models/registrations'
import { logger, errorHandler, responseBuilder } from '../../../utils'
import { isRegistered } from '../../../persistance/persistance'
import { Config } from '../../../config'

type ReqType = 'Data' | 'Discovery'
const VALID_RELATIONSHIPS = Object.values(RelationshipType)

// Workaround: Locals is of type PermissionLocals but there is an issue with the express types
type proxyGuardController = expressTypes.Controller<{ oid: string }, { sparql: string }, {}, void, PermissionLocals>

export const validatePermissions = (endpoint: ReqType) => {
    return function (req, res, next) {
        const sourceoid = req.headers.sourceoid || req.headers['X-sourceoid'] as string
        
        // CASE sourceId not provided --> Reject request
        if (!sourceoid) {
            logger.error('sourceId not provided')
            return responseBuilder(HttpStatusCode.FORBIDDEN, res, 'SourceId not provided')
        }

        // Add originId to locals
        res.locals.originId = sourceoid.toString()

        // CASE is local request -- Gateway
        if (sourceoid === Config.GATEWAY.ID) {
            logger.debug('Receiving discovery from my node infrastructure')
            res.locals.relationship = RelationshipType.ME
            return next()
        }

        isLocal(sourceoid.toString()).then((local) => {
            // CASE is local request -- Item registered in the Node
            if (local) {
                logger.debug('Receiving discovery from my node infrastructure')
                res.locals.relationship = RelationshipType.ME
                return next()
            }
            // CASE is NOT local request - Test relationship
            discovery.getRelationship(sourceoid.toString()).then(
                (relationship) => {
                    // Check if relationship is valid --> Reject if invalid
                    if (VALID_RELATIONSHIPS.indexOf(relationship) === -1) {
                        logger.error('Unvalid relationship type: ' + relationship)
                        return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Unvalid relationship type')
                    }

                    // Data requests need to know originating Item
                    if (endpoint === 'Data') {
                        res.locals.relationship = relationship
                        return next()
                    }

                    if (relationship === RelationshipType.ME) {
                    // CASE is a request from our organisation --> Retrieve all items
                        res.locals.relationship = RelationshipType.ME
                        logger.debug('Receiving discovery from different node in my organisation')
                        return next()
                    } else {
                    // CASE is NOT a request from our organisation --> Check for items privacy to return only fitting ones
                        checkPrivacy(relationship).then(
                            (items) => {
                                // save to locals
                                res.locals.relationship = relationship
                                res.locals.items = items
                                return next()
                            }
                        ).catch(
                        // Case checking privacy fails --> Return nothing!
                            (err) => {
                                errorCallback(err)
                                res.locals.items = []
                                res.locals.relationship = RelationshipType.OTHER
                                return next()
                            }
                        )
                    }
                }
            ).catch((err) => {
            // Case checking relationship fails --> Assume OTHER organisation is calling == MAX restriction level
                const error = errorHandler(err)
                logger.error(error.message)
                logger.debug('Get relationship failed... Assuming incoming request from NOT friend organisation')
                checkPrivacy(RelationshipType.OTHER).then(
                    (items) => {
                        // save to locals
                        res.locals.relationship = RelationshipType.OTHER
                        res.locals.items = items
                        return next()
                    }
                ).catch(
                // Case checking privacy fails --> Return nothing
                    (err2) => {
                        errorCallback(err2)
                        res.locals.items = []
                        res.locals.relationship = RelationshipType.OTHER
                        return next()
                    }
                )
            })
        })
    } as proxyGuardController
}

// Private functions

const isLocal = async (oid: string): Promise<boolean> => {
    return isRegistered(oid)
}

const checkPrivacy = async (rel: RelationshipType) => {
    // Test privacy
    const itemsWithPrivacy = await security.getItemsPrivacy() as IItemPrivacy[]
    const globalPrivacy = rel === RelationshipType.FRIEND ?
    ItemPrivacy.FOR_FRIENDS : ItemPrivacy.PUBLIC
    // Filter items based on relationship and privacy level
    return itemsWithPrivacy.filter(it => {
        return it.privacy >= globalPrivacy
    }).map(it => it.oid)
}

const errorCallback = (err: unknown) => {
    logger.debug('Get privacy failed... Returning empty array...')
    const error = errorHandler(err)
    logger.error(error.message)
}
