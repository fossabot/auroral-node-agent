/**
 * routes.js
 * Proxy router interface
 * Endpoint 'agent'
 * Gateway calls endpoint agent/... to send data collected from the network to the adapters
 * @interface
 */
 
 // Express router
import { Router } from 'express'
// Middlewares
import { redisDb } from '../../persistance/redis'
// Controllers
import * as ctrl from './controller'
// Middlewares
import { validatePermissions } from '../middlewares/proxy-guard'
import { listenForNotifications } from '../middlewares/notification-listener'

const ProxyRouter = Router()

ProxyRouter
     // ***** Gateway proxy *****
     .get('/objects/:id/properties/:pid', redisDb.getCached, ctrl.getProperty) // receive property request from gtw
     .put('/objects/:id/properties/:pid', ctrl.setProperty) // receive request to upd property from gtw
     // .post('/objects/:oid/actions/:aid') // receive request to start action
     // .delete('/objects/:oid/actions/:aid') // receive request to stop action
     .put('/objects/:id/events/:eid', ctrl.receiveEvent) // get event from channel where you are subscribed
     .post('/objects/:id/discovery', validatePermissions(), ctrl.discovery) // Get discovery request (From local or remote, with or w/o sparql query)
     .post('/objects/:agid/notifications/:nid', listenForNotifications())
   
export { ProxyRouter }
