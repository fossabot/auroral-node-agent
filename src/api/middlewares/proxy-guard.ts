import { expressTypes } from '../../types/index'
import { gateway } from '../../microservices/gateway'

// Other imports
import { IItemPrivacy, ItemPrivacy, JsonType, RelationshipType } from '../../types/misc-types'
import { PermissionLocals } from '../../types/locals-types'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger, errorHandler, responseBuilder } from '../../utils'

type proxyGuardController = expressTypes.Controller<{ id: string }, { sparql: JsonType }, {}, void, PermissionLocals>

export const validatePermissions = () => {
    return function (req, res, next) {
        const id = req.params.id
        const sourceoid = req.headers.sourceoid as string
        // const sourceoid = '0d9e577c-ed9d-4bdd-a241-3b11d810aeba'

        if (!sourceoid) {
            logger.error('sourceId not provided')
            return responseBuilder(HttpStatusCode.FORBIDDEN, res, 'SourceId not provided')
        }
        logger.debug('SOURCE OID: ' + sourceoid)
        // local request
        if (sourceoid === process.env.GTW_ID) {
            logger.debug('My GATEWAY, skipping')
            res.locals.relationship = RelationshipType.ME
            next()
        }

        // Test relationship
        gateway.getRelationship(sourceoid).then(
            (relationship) => {
                if (relationship.message === RelationshipType.ME) {
                    // if me -> pass
                    res.locals.relationship = RelationshipType.ME
                    logger.debug('My item, skipping')
                    next()
                } else {
                    // Test privacy
                    gateway.getItemsPrivacy().then(
                        (itemsWithPrivacy) => {
                            // getRelationship
                            const rel = relationship.message === RelationshipType.FRIEND ?
                                RelationshipType.FRIEND : RelationshipType.OTHER
                            // set privacy based on RelationshipType
                            const globalPrivacy = rel === RelationshipType.FRIEND ? ItemPrivacy.FOR_FRIENDS : ItemPrivacy.PUBLIC
                            // filter items
                            const items = (itemsWithPrivacy.message as IItemPrivacy[]).filter(it => {
                                return it.privacy >= globalPrivacy
                            }).map(it => it.oid)
                            // save to locals
                            res.locals.relationship = rel
                            res.locals.items = items
                            next()
                        }
                    )
                }
            }
        ).catch((err) => {
            const error = errorHandler(err)
            logger.error(error.message)
            res.locals.items = []
            res.locals.relationship = RelationshipType.OTHER
        }
        )
    } as proxyGuardController
}
