import { expressTypes } from '../../types/index'
import { security } from '../../core/security'

// Other imports
import { IItemPrivacy, JsonType, RelationshipType } from '../../types/misc-types'
import { PermissionLocals } from '../../types/locals-types'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { ItemPrivacy } from '../../persistance/models/registrations'
import { logger, errorHandler, responseBuilder } from '../../utils'
import { Config } from '../../config'

const VALID_RELATIONSHIPS = Object.values(RelationshipType)

type proxyGuardController = expressTypes.Controller<{ id: string }, { sparql: JsonType }, {}, void, PermissionLocals>

export const validatePermissions = () => {
    return function (req, res, next) {
        const sourceoid = req.headers.sourceoid as string
        
        // CASE sourceId not provided --> Reject request
        if (!sourceoid) {
            logger.error('sourceId not provided')
            return responseBuilder(HttpStatusCode.FORBIDDEN, res, 'SourceId not provided')
        }

        // CASE is local request
        if (sourceoid === Config.GATEWAY.ID) {
            logger.debug('Receiving discovery from my node infrastructure')
            res.locals.relationship = RelationshipType.ME
            return next()
         }

        // CASE is NOT local request - Test relationship
        security.getRelationship(sourceoid).then(
            (relationship) => {
                // Check if relationship is valid --> Reject if invalid
                if (VALID_RELATIONSHIPS.indexOf(relationship) === -1) {
                    logger.error('Unvalid relationship type: ' + relationship)
                    return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Unvalid relationship type')
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
                }
            )
        })
    } as proxyGuardController
}

// Private functions

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
