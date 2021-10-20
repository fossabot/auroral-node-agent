// Controller common imports
import { expressTypes } from '../../types/index'
import { HttpStatusCode } from '../../utils/http-status-codes'
import { logger, errorHandler } from '../../utils'
import { responseBuilder } from '../../utils/response-builder'

// Other imports
import * as persistance from '../../persistance/persistance'
import { Registration } from '../../persistance/models/registrations'
import { gateway } from '../../microservices/gateway'
import { Configuration } from '../../persistance/models/configurations'
import { Thing } from '../../types/wot-types'
import { wot } from '../../microservices/wot'
import { Config } from '../../config'

// Types and enums
enum registrationAndInteractions {
    REGISTRATIONS = 'registrations',
    PROPERTIES = 'properties',
    ACTIONS = 'actions',
    EVENTS = 'events'
}

// Controllers

type configurationCtrl = expressTypes.Controller<{}, {}, {}, Configuration, {}>
 
export const getConfiguration: configurationCtrl = async (req, res) => {
    try {
        const config = await persistance.getConfigInfo()
        logger.info('Requested configuration file')
        return responseBuilder(HttpStatusCode.OK, res, null, config)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
	}
}

type getRegistrationsCtrl = expressTypes.Controller<{ id?: string }, {}, {}, Registration | string[], {}>
 
export const getRegistrations: getRegistrationsCtrl = async (req, res) => {
    const { id } = req.params
    try {
        const data = await persistance.getItem(registrationAndInteractions.REGISTRATIONS , id)
        return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
	}
}

type getRegistrationsTdCtrl = expressTypes.Controller<{ id: string }, {}, {}, Thing | string | undefined, {}>
 
export const getRegistrationsTd: getRegistrationsTdCtrl = async (req, res) => {
    const { id } = req.params
    try {
        let result
        if (Config.WOT.ENABLED) {
                result = (await wot.retrieveTD(id)).message
        } else {
                result = 'You need to enable WoT to use this function'
        }
        return responseBuilder(HttpStatusCode.OK, res, null, result)
	} catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(error.status, res, error.message)
	}
}

type importsCtrl = expressTypes.Controller<{}, {}, {}, null, {}>
 
export const importFiles: importsCtrl = async (req, res) => {
    try {
                // await persistance.loadConfigurationFile(registrationAndInteractions.PROPERTIES)
                // await persistance.loadConfigurationFile(registrationAndInteractions.EVENTS)
                // await persistance.loadConfigurationFile(registrationAndInteractions.ACTIONS)
                await persistance.loadConfigurationFile(registrationAndInteractions.REGISTRATIONS)
                return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return responseBuilder(error.status, res, error.message)
	}
}

type exportsCtrl = expressTypes.Controller<{}, {}, {}, null, {}>
 
export const exportFiles: exportsCtrl = async (req, res) => {
    try {
        // await persistance.saveConfigurationFile(registrationAndInteractions.PROPERTIES)
        // await persistance.saveConfigurationFile(registrationAndInteractions.EVENTS)
        // await persistance.saveConfigurationFile(registrationAndInteractions.ACTIONS)
        await persistance.saveConfigurationFile(registrationAndInteractions.REGISTRATIONS)
        return responseBuilder(HttpStatusCode.OK, res, null, null)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
	}
}

type healthCheckCtrl = expressTypes.Controller<{}, {}, {}, { Redis: string, Gateway: string, NodeApp: string }, {}>
 
export const healthCheck: healthCheckCtrl = async (req, res) => {
    try {
        const redisHealth = await persistance.redisHealth()
        const gtwHealth = !(await gateway.health()).error ? 'OK' : 'DOWN'
        const response = { 'Redis': redisHealth, 'Gateway': gtwHealth, 'NodeApp': 'OK' }
        return responseBuilder(HttpStatusCode.OK, res, null, response)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
	}
}
