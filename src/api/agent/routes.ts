/**
 * routes.js
 * Administration router interface
 * Endpoint 'api'
 * User requests information about the system configuration and local infrastructure
 * @interface
 */
// Express router
import { Router } from 'express'
// Controllers
import * as ctrl from './controller' 

const AgentRouter = Router()

AgentRouter
// ADMINISTRATION endpoints
.get('/configuration', ctrl.getConfiguration)
// .post('/configuration', ctrl.reloadConfiguration)
// .put('/configuration', ctrl.updateConfiguration)
// .delete('/configuration', ctrl.removeConfiguration)
.get('/registrations', ctrl.getRegistrations)
.get('/registrations/:id', ctrl.getRegistrations)
.get('/registrations/td/:id', ctrl.getRegistrationsTd)
// IN AURORAL WE CURRENTLY DONT PERSIST INTERACTIONS INFO
// .get('/properties', ctrl.getProperties)
// .get('/properties/:id', ctrl.getProperties)
// .post('/properties', ctrl.postProperties)
// .delete('/properties/:id', ctrl.deleteProperties)
// .get('/actions', ctrl.getActions)
// .get('/actions/:id', ctrl.getActions)
// .post('/actions', ctrl.postActions)
// .delete('/actions/:id', ctrl.deleteActions)
// .get('/events', ctrl.getEvents)
// .get('/events/:id', ctrl.getEvents)
// .post('/events', ctrl.postEvents)
// .delete('/events/:id', ctrl.deleteEvents)
// IMPORT/EXPORT endpoints
.get('/imports', ctrl.importFiles)
.get('/exports', ctrl.exportFiles)
// HEALTHCHECK endpoints
.get('/healthcheck', ctrl.healthCheck)
   
export { AgentRouter }
