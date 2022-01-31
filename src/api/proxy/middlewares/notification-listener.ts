import { expressTypes } from '../../../types/index'
import { discovery } from '../../../core/discovery'
import { security } from '../../../core/security'
import { ContractItemType, ContractType , JsonType } from '../../../types/misc-types'

// Other imports
import { logger, errorHandler, responseBuilder, HttpStatusCode } from '../../../utils'

type notifListenerController = expressTypes.Controller<{ agid: string, nid: XmppNotificationTypes }, {}, {}, void, {}>

// Types of cloud notification
enum XmppNotificationTypes {
    PRIVACY = 'privacyUpdate',
    PARTNERS = 'partnersUpdate',
    CONTRACT_CREATE = 'contractsCreate',
    CONTRACT_REMOVE = 'contractsRemove',
    CONTRACT_ITEM_UPDATE = 'contractsItemUpdate',
    CONTRACT_ITEM_REMOVE = 'contractsItemRemove'
}

// User sending notifications
const XMPP_USER = 'auroral-dev-user'

export const listenForNotifications = () => {
    return function (req, res, next) {
        const { agid, nid } = req.params
        const data = req.body
        const sourceoid = req.headers.sourceoid as string
        if (sourceoid === XMPP_USER) {
            notificationsSwitch(nid, data)
            .then(() => { 
                return responseBuilder(HttpStatusCode.OK, res, null)
            })
            .catch((err) => {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(HttpStatusCode.OK, res, null)
            })
        } else {
            logger.error('The user ' + sourceoid + ' cannot send notifications')
            return responseBuilder(HttpStatusCode.FORBIDDEN, res, 'Notification sent by unauthorized user')
        }
    } as notifListenerController
}

const notificationsSwitch = (x: XmppNotificationTypes, data: JsonType) => {
    switch (x) {
        case XmppNotificationTypes.PRIVACY:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.PRIVACY)
            return security.cacheItemsPrivacy()
        case XmppNotificationTypes.PARTNERS:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.PARTNERS)
            return discovery.reloadPartners()
        case XmppNotificationTypes.CONTRACT_CREATE:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.CONTRACT_CREATE)
            return Promise.resolve()
        case XmppNotificationTypes.CONTRACT_REMOVE:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.CONTRACT_REMOVE)
            return security.delContract(data as ContractType)
        case XmppNotificationTypes.CONTRACT_ITEM_UPDATE:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.CONTRACT_ITEM_UPDATE)
            return security.updItemInContract(data as ContractItemType)
        case XmppNotificationTypes.CONTRACT_ITEM_REMOVE:
            logger.info('Notification from cloud received: ' + XmppNotificationTypes.CONTRACT_ITEM_REMOVE)
            return security.delItemInContract(data as ContractItemType)
        default:
            logger.error('Wrong notification type received from cloud: ' + x)
            return Promise.reject()
    }
}
