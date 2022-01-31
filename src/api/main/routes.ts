/**
 * routes.js
 * Agent router interface
 * Endpoint 'api'
 * User can use this interface to make requests to the agent
 * The agent will then access the network through the gateway or consume resources from the WoT
 * Provides also information about the system configuration and local infrastructure
 * @interface
 */
// Express router
import { Router } from 'express'
// Controllers
import { auth, registry, collaborate, discovery, consume, admin } from './controllers' 
 
const MainRouter = Router()

MainRouter
  // ***** AUTH endpoints *****
   .get('/login', auth.login)
   .get('/login/:id', auth.login)
   .get('/logout', auth.logout)
   .get('/logout/:id', auth.logout)

   // ***** REGISTRY endpoints *****
   .get('/registration', registry.getRegistrations)
   .get('/registration/:id', registry.getRegistrationsInfo)
   .post('/registration', registry.postRegistrations)
   .put('/registration', registry.modifyRegistration)
   .post('/registration/remove', registry.removeRegistrations)

  // ***** DISCOVERY endpoints *****
  // LOCAL
   .get('/discovery/neighbours', discovery.discoveryLocal)
   .get('/discovery/neighbours/:id', discovery.discoveryLocal)
   .get('/discovery/td-local/:id', discovery.discoverLocalTd)
  // TBD  .post('/discovery/semantic', ctrl.getRegistrationsTd) 
  // REMOTE
   .post('/discovery/td-remote/:id/:originId', discovery.discoveryRemote)
  // TBD .post('/discovery/semantic/:agid', ctrl.discoveryRemote)
  // TBD discover neighbours from specific CID or CTID
  // TBD Federate sparql query

  // ***** CONSUME remote resources *****
   .get('/properties/:id/:oid/:pid', consume.getProperty) // Request remote property
   .put('/properties/:id/:oid/:pid', consume.setProperty) // Update remote property
   // .get('/actions/:id/:oid/:aid/:tid') // Get action status
   // .post('/actions/:id/:oid/:aid') // Start task on remote action
   // .put('/actions/:id/:oid/:aid') // Update status of task
   // .delete('/actions/:id/:oid/:aid/:tid') // Stop task
   .post('/events/local/:id/:eid', consume.activateEventChannel) // Create my event channel
   .put('/events/local/:id/:eid', consume.publishEvent) // Put a message in my event channel
   .delete('/events/local/:id/:eid', consume.deactivateEventChannel) // Delete my event channel
   .get('/events/remote/:id/:oid/:eid', consume.statusRemoteEventChannel) // Get status of a remote event channel
   .post('/events/remote/:id/:oid/:eid', consume.subscribeRemoteEventChannel) // Subscribe to remote event channel
   .delete('/events/remote/:id/:oid/:eid', consume.unsubscribeRemoteEventChannel) // Unsubscribe to remote event channel
  //  .get('/events/subscribe', ctrl.eventsSubscribeAll)
  //  .delete('/events/subscribe',ctrl.eventsUnsubscribeAll)

  // ***** COLLABORATION endpoints *****
  .get('/collaboration/partners/', collaborate.getPartners)
  .get('/collaboration/partners/:cid', collaborate.getPartnerInfo)
  .get('/collaboration/contracts/:cid', collaborate.getContract)
  // .delete('/collaboration/contracts/:cid', collaborate.delContract)

  // ***** ADMIN endpoints *****
  .get('/agent/info', admin.getConfiguration)
  .get('/agent/imports', admin.importFiles)
  .get('/agent/exports', admin.exportFiles)
  .get('/agent/healthcheck', admin.healthCheck)

export { MainRouter }
