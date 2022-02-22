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
import { Router, json, text } from 'express'
// Controllers
import { auth, registry, collaborate, discovery, consume, admin } from './controllers' 
// Middlewares
import { checkDestination, isLocal } from './middlewares'

export enum Method {
  POST = 'POST',
  GET = 'GET',
  PUT = 'PUT'
}

enum SemanticType {
  SPARQL = 'Sparql',
  TD = 'TD'
}

const MainRouter = Router()

MainRouter
  // ***** AUTH endpoints *****
   .get('/login', json(), auth.login)
   .get('/login/:id', json(), auth.login)
   .get('/logout', json(), auth.logout)
   .get('/logout/:id', json(), auth.logout)

   // ***** REGISTRY endpoints *****
   .get('/registration', json(), registry.getRegistrations)
   .get('/registration/:id', json(), registry.getRegistrationsInfo)
   .post('/registration', json(), registry.postRegistrations)
   .put('/registration', json(), registry.modifyRegistration)
   .post('/registration/remove', json(), registry.removeRegistrations)
   .get('/registration/oid/:adapterId', json(), registry.getOidByAdapter)

  // ***** DISCOVERY endpoints *****
  // LOCAL
   .get('/discovery/local/neighbours', json(), discovery.discoveryLocal)
   .get('/discovery/local/neighbours/:id', json(), discovery.discoveryLocal)
   .get('/discovery/local/td/:id', json(), discovery.discoverLocalTd)
   .post('/discovery/local/semantic', text(), discovery.discoverLocalSemantic) // Expects plain text
  // REMOTE
   .get('/discovery/remote/td/:id/:originId', json(), isLocal(SemanticType.TD), discovery.discoveryRemote)
   .post('/discovery/remote/semantic/:id', text(), isLocal(SemanticType.SPARQL), discovery.discoveryRemote)
  // TBD .post('/discovery/semantic/:agid', ctrl.discoveryRemote)
  // TBD discover neighbours from specific CID or CTID
  // TBD Federate sparql query

  // ***** CONSUME remote resources *****
   .get('/properties/:id/:oid/:pid', json(), checkDestination(Method.GET), consume.getProperty) // Request remote property
   .put('/properties/:id/:oid/:pid', json(), checkDestination(Method.PUT), consume.setProperty) // Update remote property
   // .get('/actions/:id/:oid/:aid/:tid') // Get action status
   // .post('/actions/:id/:oid/:aid') // Start task on remote action
   // .put('/actions/:id/:oid/:aid') // Update status of task
   // .delete('/actions/:id/:oid/:aid/:tid') // Stop task
   .post('/events/local/:id/:eid', json(), consume.activateEventChannel) // Create my event channel
   .put('/events/local/:id/:eid', json(), consume.publishEvent) // Put a message in my event channel
   .delete('/events/local/:id/:eid', json(), consume.deactivateEventChannel) // Delete my event channel
   .get('/events/remote/:id/:oid/:eid', json(), consume.statusRemoteEventChannel) // Get status of a remote event channel
   .post('/events/remote/:id/:oid/:eid', json(), consume.subscribeRemoteEventChannel) // Subscribe to remote event channel
   .delete('/events/remote/:id/:oid/:eid', json(), consume.unsubscribeRemoteEventChannel) // Unsubscribe to remote event channel
  //  .get('/events/subscribe', ctrl.eventsSubscribeAll)
  //  .delete('/events/subscribe',ctrl.eventsUnsubscribeAll)

  // ***** COLLABORATION endpoints *****
  .get('/collaboration/partners/', json(), collaborate.getPartners)
  .get('/collaboration/partners/:cid', json(), collaborate.getPartnerInfo)
  .get('/collaboration/contracts/:cid', json(), collaborate.getContract)
  // .delete('/collaboration/contracts/:cid', json(), collaborate.delContract)

  // ***** ADMIN endpoints *****
  .get('/agent/info', json(), admin.getConfiguration)
  .get('/agent/imports', json(), admin.importFiles)
  .get('/agent/exports', json(), admin.exportFiles)
  .get('/agent/healthcheck', json(), admin.healthCheck)

export { MainRouter }
