// Controller common imports
import { expressTypes } from '../../types/index'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger } from '../../utils/logger'
import { responseBuilder } from '../../utils/response-builder'

// Other imports
import * as persistance from '../../persistance/persistance'
import { JsonType } from '../../types/misc-types'
import { Interaction } from '../../persistance/models/interactions'
import { Registration } from '../../persistance/models/registrations'
import { gateway } from '../../microservices/gateway'

// Types and enums
enum registrationAndInteractions {
    REGISTRATIONS = 'registrations',
    PROPERTIES = 'properties',
    ACTIONS = 'actions',
    EVENTS = 'events'
}

// Controllers

type configurationCtrl = expressTypes.Controller<{}, {}, {}, JsonType, {}>
 
export const getConfiguration: configurationCtrl = async (req, res) => {
    try {
        const config = await persistance.getConfigInfo()
        logger.info('Requested configuration file')
        return responseBuilder(HttpStatusCode.OK, res, null, config)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

type getRegistrationsCtrl = expressTypes.Controller<{ id?: string }, {}, {}, Registration | string[], {}>
 
export const getRegistrations: getRegistrationsCtrl = async (req, res) => {
    const { id } = req.params
    try {
        const data = await persistance.getItem(registrationAndInteractions.REGISTRATIONS , id)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

type getInteractionCtrl = expressTypes.Controller<{ id?: string }, {}, {}, Interaction | string[], {}>
 
export const getProperties: getInteractionCtrl = async (req, res) => {
    const { id } = req.params
    try {
        const data = await persistance.getItem(registrationAndInteractions.PROPERTIES , id)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}
 
export const getActions: getInteractionCtrl = async (req, res) => {
    const { id } = req.params
    try {
        const data = await persistance.getItem(registrationAndInteractions.ACTIONS , id)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}
 
export const getEvents: getInteractionCtrl = async (req, res) => {
    const { id } = req.params
    try {
        const data = await persistance.getItem(registrationAndInteractions.EVENTS , id)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

type postInteractionCtrl = expressTypes.Controller<{}, Interaction, {}, null, {}>
 
export const postProperties: postInteractionCtrl = async (req, res) => {
    const body = req.body
    try {
        await persistance.addItem(registrationAndInteractions.PROPERTIES, body)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

export const postActions: postInteractionCtrl = async (req, res) => {
    const body = req.body
    try {
        await persistance.addItem(registrationAndInteractions.ACTIONS, body)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

export const postEvents: postInteractionCtrl = async (req, res) => {
    const body = req.body
    try {
        await persistance.addItem(registrationAndInteractions.EVENTS, body)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

type deleteInteractionCtrl = expressTypes.Controller<{ id: string }, {}, {}, null, {}>
 
export const deleteProperties: deleteInteractionCtrl = async (req, res) => {
    const { id } = req.params
    try {
        await persistance.removeItem(registrationAndInteractions.PROPERTIES, id)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

export const deleteActions: deleteInteractionCtrl = async (req, res) => {
    const { id } = req.params
    try {
        await persistance.removeItem(registrationAndInteractions.ACTIONS, id)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

export const deleteEvents: deleteInteractionCtrl = async (req, res) => {
    const { id } = req.params
    try {
        await persistance.removeItem(registrationAndInteractions.EVENTS, id)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

type importsCtrl = expressTypes.Controller<{}, {}, {}, null, {}>
 
export const importFiles: importsCtrl = async (req, res) => {
    try {
        await persistance.loadConfigurationFile(registrationAndInteractions.PROPERTIES)
        await persistance.loadConfigurationFile(registrationAndInteractions.EVENTS)
        await persistance.loadConfigurationFile(registrationAndInteractions.ACTIONS)
        await persistance.loadConfigurationFile(registrationAndInteractions.REGISTRATIONS)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

type exportsCtrl = expressTypes.Controller<{}, {}, {}, null, {}>
 
export const exportFiles: exportsCtrl = async (req, res) => {
    try {
        await persistance.saveConfigurationFile(registrationAndInteractions.PROPERTIES)
        await persistance.saveConfigurationFile(registrationAndInteractions.EVENTS)
        await persistance.saveConfigurationFile(registrationAndInteractions.ACTIONS)
        await persistance.saveConfigurationFile(registrationAndInteractions.REGISTRATIONS)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}

type healthCheckCtrl = expressTypes.Controller<{}, {}, {}, { Redis: string, Gateway: string, NodeApp: string }, {}>
 
export const healthCheck: healthCheckCtrl = async (req, res) => {
    try {
        const redisHealth = await persistance.redisHealth()
        const gtwHealth = (await gateway.health()).message
        const response = { 'Redis': redisHealth, 'Gateway': gtwHealth, 'NodeApp': 'OK' }
        return responseBuilder(HttpStatusCode.OK, res, null, response)
	} catch (err) {
		logger.error(err.message)
		return responseBuilder(HttpStatusCode.INTERNAL_SERVER_ERROR, res, err)
	}
}
