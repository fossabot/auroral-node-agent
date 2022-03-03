// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler } from '../../../utils'
import { responseBuilder } from '../../../utils/response-builder'

// Other imports
import * as persistance from '../../../persistance/persistance'
import { gateway } from '../../../microservices/gateway'
import { gtwServices } from '../../../core/gateway'
import { RegistrationResultPost } from '../../../types/gateway-types'
import { Registration, RegistrationJSON, RegistrationJSONTD, UpdateJSON, UpdateJSONTD } from '../../../persistance/models/registrations'
import { removeItem, getOidByAdapterId } from '../../../persistance/persistance'
import { tdParser, tdParserUpdate, tdParserUpdateWot, tdParserWoT } from '../../../core/td-parser'
import { Config } from '../../../config'
import { wot } from '../../../microservices/wot'
import { UpdateResult } from '../../../types/misc-types'

// Types and enums
enum registrationAndInteractions {
    REGISTRATIONS = 'registrations',
    PROPERTIES = 'properties',
    ACTIONS = 'actions',
    EVENTS = 'events'
}

type getRegistrationsCtrl = expressTypes.Controller<{}, {}, {}, string[], {}>

/**
 * Retrieve things registered in the platform
 */
export const getRegistrations: getRegistrationsCtrl = async (req, res) => {
	try {
    const data = await gateway.getRegistrations()
    return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
      const error = errorHandler(err)
      logger.error(error.message)
      return responseBuilder(error.status, res, error.message)
	}
}

type getRegistrationsInfoCtrl = expressTypes.Controller<{ id?: string }, {}, {}, Registration | string[], {}>
 
export const getRegistrationsInfo: getRegistrationsInfoCtrl = async (req, res) => {
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

type postRegistrationsCtrl = expressTypes.Controller<{}, RegistrationJSONTD | RegistrationJSONTD[] | RegistrationJSON | RegistrationJSON[] , {}, RegistrationResultPost[], {}>

/**
 * Register things in the platform
 */
export const postRegistrations: postRegistrationsCtrl = async (req, res) => {
    const body = req.body
    try {
        // Parse TD body
        // Two ways available depending if WoT enabled
        let items
        if (Config.WOT.ENABLED) {
          // Validate and Store TD in WoT** (Build TD from user input based on ontology)
          logger.debug('Validate and register with WoT')
          items = await tdParserWoT(body as RegistrationJSONTD)
        } else {
          items = await tdParser(body as RegistrationJSON)
        }
        
        // If all requests are parsed as wrong body
        if (items.registrations.length === 0) {
          return responseBuilder(HttpStatusCode.BAD_REQUEST, res, null, items.errors)
        }

        // Register TD in NM (Dont send type nor interaction patterns)
        const result = await gtwServices.registerObject(items.registrations)
        
        // Unregister from WoT on CLOUD or REDIS Error
        await Promise.all(
          result.errors.map(async it => {
            logger.info('Reverting registration in WoT of OID: ' + it.oid)
            await wot.deleteTD(it.oid)
          })
        )

        // Build final response
        const response = [...items.errors, ...result.registrations, ...result.errors]
        return responseBuilder(HttpStatusCode.CREATED, res, null, response)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
	}
}

type modifyRegistrationCtrl = expressTypes.Controller<{}, UpdateJSON | UpdateJSON[] | UpdateJSONTD | UpdateJSONTD[], {}, UpdateResult[], {}>

/**
 * Register things in the platform
 */
 export const modifyRegistration: modifyRegistrationCtrl = async (req, res) => {
  const body = req.body
      try {
          let items
          // Two ways available depending if WoT enabled
          if (Config.WOT.ENABLED) {
            logger.debug('Update thing in WoT')
            items = await tdParserUpdateWot(body as UpdateJSONTD)
          } else {
            logger.debug('Update thing without WoT')
            items = await tdParserUpdate(body as UpdateJSON)
          }

        // If all requests are parsed as wrong body
        if (items.updates.length === 0) {
          return responseBuilder(HttpStatusCode.BAD_REQUEST, res, null, items.errors)
        }

        // Update in NM and redis
        const result = await gtwServices.updateObject(items.updates)

        // Build final response
        const response = [...items.errors, ...result.updates, ...result.errors]
        return responseBuilder(HttpStatusCode.OK, res, null, response)
    } catch (err) {
          const error = errorHandler(err)
          logger.error(error.message)
          return responseBuilder(error.status, res, error.message)
    }
}

type removeRegistrationsCtrl = expressTypes.Controller<{}, { oids: string[] }, {}, null, {}>

/**
 * Remove registered object endpoint
 */
export const removeRegistrations: removeRegistrationsCtrl = async (req, res) => {
    const body = req.body
    try {
      // Logout
      await gtwServices.doLogouts(body.oids, false)
      // Remove from AURORAL platform
      await gateway.removeRegistrations(body)
      // Remove from agent
      await removeItem('registrations', req.body.oids)
      // Remove from WoT
      if (Config.WOT.ENABLED) {
        await Promise.all(
          body.oids.map(async oid => {
            logger.info('Removing ' + oid + ' from WoT')
            await wot.deleteTD(oid)
          })
        )
      }
      logger.info('Items successfully removed!')
      return responseBuilder(HttpStatusCode.OK, res, null, null)
    } catch (err) {
      const error = errorHandler(err)
      logger.error(error.message)
      return responseBuilder(error.status, res, error.message)
	}
}

type getOidByAdapterIdCtrl = expressTypes.Controller<{ adapterId: string }, {}, {}, string, {}>

/**
 * Retrieve things registered in the platform
 */
export const getOidByAdapter: getOidByAdapterIdCtrl = async (req, res) => {
  const { adapterId } = req.params
  try {
    const data = await getOidByAdapterId(adapterId)
    return responseBuilder(HttpStatusCode.OK, res, null, data)
	} catch (err) {
      const error = errorHandler(err)
      logger.error(error.message)
      return responseBuilder(error.status, res, error.message)
	}
}
