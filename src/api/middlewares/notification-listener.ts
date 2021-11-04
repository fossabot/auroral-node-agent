import { expressTypes } from '../../types/index'
import { security } from '../../core/security'
import { discovery } from '../../core/discovery'

// Other imports
import { logger, errorHandler, responseBuilder, HttpStatusCode } from '../../utils'

type notifListenerController = expressTypes.Controller<{ id: string, pid: XmppNotificationTypes }, {}, {}, void, {}>

// Types of cloud notification
enum XmppNotificationTypes {
    PRIVACY = 'privacyUpdate',
    PARTNERS = 'partnersUpdate'
}

// User sending notifications
const XMPP_USER = 'auroral-dev-user'

export const listenForNotifications = () => {
    return function (req, res, next) {
        const { pid } = req.params
        const sourceoid = req.headers.sourceoid as string
        if (sourceoid === XMPP_USER) {
            notificationsSwitch(pid)
            .then(() => { 
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

const notificationsSwitch = (x: XmppNotificationTypes) => {
    switch (x) {
        case XmppNotificationTypes.PRIVACY:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.PRIVACY)
            return security.cacheItemsPrivacy()
        case XmppNotificationTypes.PARTNERS:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.PARTNERS)
            return discovery.reloadPartners()
        default:
            logger.error('Wrong notification type received from cloud: ' + x)
            return Promise.reject()
    }
}
