/**
 * routes.js
 * Agent router interface
 * Endpoint 'agent'
 * Gateway calls endpoint agent to send data collected from the network to the agent
 * @interface
 */
// Express router
import { Router } from 'express'
// Controllers
import * as ctrl from './controller' 
 
const GtwRouter = Router()

GtwRouter
     // ***** Agent endpoints *****
   .get('/login', ctrl.login)
   .get('/login/:id', ctrl.login)
   .get('/logout', ctrl.logout)
   .get('/logout/:id', ctrl.logout)
   .get('/registration', ctrl.getRegistrations)
   .post('/registration', ctrl.postRegistrations)
   .post('/registration/remove', ctrl.removeRegistrations)
  // ***** Discovery *****
   .get('/discovery', ctrl.discovery)
   .get('/discovery/:id', ctrl.discovery)
   .post('/discovery/:id', ctrl.discoveryRemote)
   .post('/discovery/:id/:originId', ctrl.discoveryRemote)
  // ***** Consume remote resources *****
   .get('/properties/:id/:oid/:pid', ctrl.getProperty) // Request remote property
   .put('/properties/:id/:oid/:pid', ctrl.setProperty) // Update remote property
   // .get('/actions/:id/:oid/:aid/:tid') // Get action status
   // .post('/actions/:id/:oid/:aid') // Start task on remote action
   // .put('/actions/:id/:oid/:aid') // Update status of task
   // .delete('/actions/:id/:oid/:aid/:tid') // Stop task
   .post('/events/local/:id/:eid', ctrl.activateEventChannel) // Create my event channel
   .put('/events/local/:id/:eid', ctrl.publishEvent) // Put a message in my event channel
   .delete('/events/local/:id/:eid', ctrl.deactivateEventChannel) // Delete my event channel
   .get('/events/remote/:id/:oid/:eid', ctrl.statusRemoteEventChannel) // Get status of a remote event channel
   .post('/events/remote/:id/:oid/:eid', ctrl.subscribeRemoteEventChannel) // Subscribe to remote event channel
   .delete('/events/remote/:id/:oid/:eid', ctrl.unsubscribeRemoteEventChannel) // Unsubscribe to remote event channel
  //  .get('/events/subscribe', ctrl.eventsSubscribeAll)
  //  .delete('/events/subscribe',ctrl.eventsUnsubscribeAll)
 
export { GtwRouter }
