import { expressTypes } from '../../types/index'
import { security } from '../../core/security'

// Other imports
import { logger, errorHandler, responseBuilder, HttpStatusCode } from '../../utils'

type notifListenerController = expressTypes.Controller<{ id: string, pid: string }, {}, {}, void, {}>

// Types of cloud notification
enum XmppNotificationTypes {
    PRIVACY = 'privacyUpdate',
}

// User sending notifications
const XMPP_USER = 'auroral-dev-user'

export const listenForNotifications = () => {
    return function (req, res, next) {
        const { pid } = req.params
        const sourceoid = req.headers.sourceoid as string
        if (sourceoid === XMPP_USER && pid === XmppNotificationTypes.PRIVACY) {
            security.cacheItemsPrivacy()
            .then(() => { 
                logger.info('Notification from cloud received: ' + XmppNotificationTypes.PRIVACY)
                return responseBuilder(HttpStatusCode.OK, res, null)
            })
            .catch((err) => {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(HttpStatusCode.OK, res, null)
            })
        } else {
            return next()
        }
    } as notifListenerController
}

