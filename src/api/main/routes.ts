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
import { auth, registry, collaborate, discovery, consume, admin, httpProxy } from './controllers' 
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
  .post('/registration/odrl/:oid/:pid', text(), registry.postOdrl)

  // ***** DISCOVERY endpoints *****
  // Neighbourhood
  .get('/discovery/nodes/organisation', json(), discovery.getOrganisationNodes)
  .get('/discovery/nodes/organisation/:cid', json(), discovery.getOrganisationNodes)
  .get('/discovery/nodes/community/:commid', json(), discovery.getCommunityNodes)
  .get('/discovery/items/organisation', json(), discovery.getOrganisationItems)
  .get('/discovery/items/contract/:ctid', json(), discovery.getContractItems)
  .get('/discovery/items/contract/:ctid/origin/:oid', json(), discovery.getContractItems)
  // .get('/discovery/local/neighbours', json(), discovery.discoveryLocal) // All items my gateway can see
  // .get('/discovery/local/neighbours/:id', json(), discovery.discoveryLocal) // All items my device can see
  // LOCAL Semantic
  .get('/discovery/local/td/:oid', json(), discovery.discoverLocalTd)
  .post('/discovery/local/semantic', text(), discovery.discoverLocalSemantic) // Expects plain text
  .get('/discovery/local/semantic/:query', discovery.discoverLocalSemantic)
  // REMOTE Semantic
  .get('/discovery/remote/td/:agid', json(), isLocal(SemanticType.TD), discovery.discoveryTdRemote)
  .post('/discovery/remote/semantic', text(), discovery.discoveryFederative)
  .get('/discovery/remote/semantic/predefined/:query', discovery.discoveryFederative)
  .post('/discovery/remote/semantic/community/:commid', text(), discovery.discoveryCommunityFederative)
  .post('/discovery/remote/semantic/myorganisation', text(), discovery.discoveryOrganisationFederative)
  // WOT internal use for federated queries 
  .get('/discovery/remote/semantic/:agid', text(), isLocal(SemanticType.SPARQL), discovery.discoveryRemote)
  // TBD .post('/discovery/semantic/:agid', ctrl.discoveryRemote)
  // TBD discover neighbours from specific CID or CTID

  // ***** CONSUME remote resources *****
  .get('/properties/:id/:oid/:pid', httpProxy.tryHttpProxy, json(), checkDestination(Method.GET), consume.getProperty) // Request remote property
  .put('/properties/:id/:oid/:pid', httpProxy.tryHttpProxy, json(), checkDestination(Method.PUT), consume.setProperty) // Update remote property
  // .get('/actions/:id/:oid/:aid/:tid') // Get action status
  // .post('/actions/:id/:oid/:aid') // Start task on remote action
  // .put('/actions/:id/:oid/:aid') // Update status of task
  // .delete('/actions/:id/:oid/:aid/:tid') // Stop task
  .post('/events/local/:id/:eid', json(), consume.activateEventChannel) // Create my event channel
  .put('/events/local/:id/:eid', text(), consume.publishEvent) // Put a message in my event channel
  .delete('/events/local/:id/:eid', json(), consume.deactivateEventChannel) // Delete my event channel
  .get('/events/remote/channels/:id/:oid', json(), consume.getEventChannels) // Get event channels of remote Object
  .get('/events/remote/:id/:oid/:eid', json(), consume.statusRemoteEventChannel) // Get status of a remote event channel
  .post('/events/remote/:id/:oid/:eid', json(), consume.subscribeRemoteEventChannel) // Subscribe to remote event channel
  .delete('/events/remote/:id/:oid/:eid', json(), consume.unsubscribeRemoteEventChannel) // Unsubscribe to remote event channel
  // .get('/events/subscribe', ctrl.eventsSubscribeAll)
  // .delete('/events/subscribe',ctrl.eventsUnsubscribeAll)

  // ***** COLLABORATION endpoints *****
  .get('/collaboration/partners/', json(), collaborate.getPartners)
  .get('/collaboration/partners/:cid', json(), collaborate.getPartnerInfo)
  .get('/collaboration/contracts/:cid', json(), collaborate.getContract)
  .get('/collaboration/communities', json(), collaborate.getCommunities)
  // .delete('/collaboration/contracts/:cid', json(), collaborate.delContract)

  // ***** ADMIN endpoints *****
  .get('/agent/info', json(), admin.getConfiguration)
  .get('/agent/export', json(), admin.exportItems)
  .post('/agent/import', json(), registry.postRegistrations)
  .get('/agent/healthcheck', json(), admin.healthCheck)
  // .get('/agent/imports', json(), admin.importFiles)
  // .get('/agent/exports', json(), admin.exportFiles)

  // HTTP TOKENS
  .get('/auth/token/:id/:oid/:pid', json(), httpProxy.generateToken)
  .get('/auth/validate', httpProxy.validateToken)

export { MainRouter }
