/**
 * routes.js
 * Proxy router interface
 * Endpoint 'proxy'
 * Gateway calls endpoint agent/... to send data collected from the network to the adapters
 * @interface
 */
 
// Express router
import { Router } from 'express'
// Persistance
import { redisDb } from '../../persistance/redis'
// Controllers
import * as ctrl from './controller'
// Middlewares
import { validatePermissions } from './middlewares/proxy-guard'
import { listenForNotifications } from './middlewares/notification-listener'

// Types

enum ReqType {
     DISCOVERY = 'Discovery',
     DATA = 'Data'
}

const ProxyRouter = Router()

ProxyRouter
     // ***** Gateway proxy *****
     .get('/objects/:oid/properties/:pid', validatePermissions(ReqType.DATA), ctrl.getProperty) // receive property request from gtw
     .put('/objects/:oid/properties/:pid', validatePermissions(ReqType.DATA), ctrl.setProperty) // receive request to upd property from gtw
     // .post('/objects/:oid/actions/:aid') // receive request to start action
     // .delete('/objects/:oid/actions/:aid') // receive request to stop action
     .put('/objects/:oid/events/:eid', ctrl.receiveEvent) // get event from channel where you are subscribed
     .post('/objects/:oid/discovery', validatePermissions(ReqType.DISCOVERY), ctrl.discovery) // Get discovery request (From remote, with or w/o sparql query)
     .post('/objects/:agid/notifications/:nid', listenForNotifications())
   
export { ProxyRouter }
