// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler } from '../../../utils'
import { responseBuilder } from '../../../utils/response-builder'

// Other imports
import * as persistance from '../../../persistance/persistance'
import { gateway } from '../../../microservices/gateway'
import { Configuration } from '../../../persistance/models/configurations'
import { JsonType } from '../../../types/misc-types'
import { wot } from '../../../microservices/wot'
import { Thing } from '../../../types/wot-types'
import { Config } from '../../../config'

// Types and enums
enum registrationAndInteractions {
    REGISTRATIONS = 'registrations',
    PROPERTIES = 'properties',
    ACTIONS = 'actions',
    EVENTS = 'events'
}

// Controllers

type configurationCtrl = expressTypes.Controller<{}, {}, {}, Configuration, {}>
 
export const getConfiguration: configurationCtrl = async (_req, res) => {
    try {
        const config = await persistance.getConfigInfo()
        logger.info('Requested configuration file')
        return responseBuilder(HttpStatusCode.OK, res, null, { ...config, agid: Config.GATEWAY.ID })
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
	}
}

// type importsCtrl = expressTypes.Controller<{}, {}, {}, null, {}>
 
// export const importFiles: importsCtrl = async (_req, res) => {
//     try {
//                 // await persistance.loadConfigurationFile(registrationAndInteractions.PROPERTIES)
//                 // await persistance.loadConfigurationFile(registrationAndInteractions.EVENTS)
//                 // await persistance.loadConfigurationFile(registrationAndInteractions.ACTIONS)
//                 await persistance.loadConfigurationFile(registrationAndInteractions.REGISTRATIONS)
//                 return responseBuilder(HttpStatusCode.OK, res, null, null)
// 	} catch (err) {
//                 const error = errorHandler(err)
//                 logger.error(error.message)
//                 return responseBuilder(error.status, res, error.message)
// 	}
// }

// type exportsCtrl = expressTypes.Controller<{}, {}, {}, null, {}>
 
// export const exportFiles: exportsCtrl = async (req, res) => {
//     try {
//         // await persistance.saveConfigurationFile(registrationAndInteractions.PROPERTIES)
//         // await persistance.saveConfigurationFile(registrationAndInteractions.EVENTS)
//         // await persistance.saveConfigurationFile(registrationAndInteractions.ACTIONS)
//         await persistance.saveConfigurationFile(registrationAndInteractions.REGISTRATIONS)
//         return responseBuilder(HttpStatusCode.OK, res, null, null)
// 	} catch (err) {
//         const error = errorHandler(err)
//         logger.error(error.message)
//         return responseBuilder(error.status, res, error.message)
// 	}
// }

type healthCheckCtrl = expressTypes.Controller<{}, {}, {}, { Redis: string, Gateway: string, NodeApp: string }, {}>
 
export const healthCheck: healthCheckCtrl = async (_req, res) => {
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

// exportItems

type exportItemsCtrl = expressTypes.Controller<{}, {}, {}, { td: Thing }[], {}>

export const exportItems: exportItemsCtrl = async (_req, res) => {
    try {
        const items = [] as JsonType[]
        const oids = (await gateway.getRegistrations()).message
        for (const oid of oids) {
            const td = await wot.retrieveTD(oid)
            if (td.error || !td.message) {
                throw new Error(`Could not retrieve TD for ${oid}`)
            } 
            items.push({ td: cleanTD(td.message) })
        }
        return res.status(200).json(items)
    } catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
    }
}

// Private functions

function cleanTD(td: Thing) :Thing {
    delete td.oid
    delete td.id
    return td
}
