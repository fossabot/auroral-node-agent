// Controller common imports
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { logger, errorHandler, MyError } from '../../../utils'
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
import { JsonType, RemoveResult, UpdateResult } from '../../../types/misc-types'
import { removeMapping, storeMapping, useMapping } from '../../../core/mapping'

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
    const data = (await gateway.getRegistrations()).message
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
        if (result.errors.length > 0) {
          await Promise.all(
            result.errors.map(async it => {
              logger.info('Reverting registration in WoT of OID: ' + it.oid)
              await wot.deleteTD(it.oid)
            })
          )
        }

        // Build final response
        const response = [...items.errors, ...result.registrations, ...result.errors]
        return responseBuilder(HttpStatusCode.CREATED, res, null, response)
	} catch (err) {
        const error = errorHandler(err)
        logger.error(error.message)
        return responseBuilder(error.status, res, error.message)
	} finally {
        // Create mappings
        if (Config.WOT.ENABLED) {
          const data = req.body as unknown as RegistrationJSONTD | RegistrationJSONTD[]
          const itemsArray = Array.isArray(data) ? data : [data]
          for (const reg of itemsArray) {
              await storeMapping(reg.td.id!)          
          }
      }
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

          if (Config.WOT.ENABLED) {
            // remove mappings for succesfull updates registrations
            for (const item of items.updates) {
              await removeMapping(item.oid)          
            }
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
      } finally {
        // Create mappings
        if (Config.WOT.ENABLED) {
          const data = req.body as unknown as UpdateJSONTD | UpdateJSONTD[]
          const itemsArray = Array.isArray(data) ? data : [data]
          for (const reg of itemsArray) {
              await storeMapping(reg.td.id!)          
          }
      }
    }
}

type removeRegistrationsCtrl = expressTypes.Controller<{}, { oids: string[] }, {}, RemoveResult[], {}>

/**
 * Remove registered object endpoint
 */
export const removeRegistrations: removeRegistrationsCtrl = async (req, res) => {
    const oids = req.body.oids
     try {
      // Function variables
      const failed : { oid: string, error?: string, statusCode: number }[] = []
      const success : { oid: string, error?: string, statusCode: number }[] = []
      let platformAns: { oid: string, error?: string, statusCode: number }[] = []
      let unregisterLocaly: string[] = []

      // Remove items from WoT
      if (Config.WOT.ENABLED) {
        for (let i = 0, l = oids.length; i < l; i++) {
            const oid = oids[i]
            // Remove from WoT
            logger.info('Removing ' + oid + ' from WoT')
            
            // remove mappings 
            await removeMapping(oid)          

            try {
              await wot.deleteTD(oid)
              success.push({ oid: oid, statusCode: 200 })
            } catch (err) {
              const error = errorHandler(err)
              if (error.status === 404) {
                success.push({ oid: oid, statusCode: 404 })
              } else {
                failed.push({ oid: oid, statusCode: 500, error: error.message })
              }
            }
          }
      } else {
        // WOT DISABLED
        oids.forEach(oid => {
          success.push({ oid, statusCode: 200 })
        })
      }

      // Extract oid from items successfully removed form WoT
      const oidsToCloud = success.map(it => it.oid)

      try {
        // Remove from AURORAL platform
        platformAns = (await gateway.removeRegistrations({ oids: oidsToCloud })).message
        // failed = [...failed, ...platformAns.filter((item) => item.statusCode !== 200)]
      } catch (error) {
        throw new MyError('Error in platform while unregistering, please try again', HttpStatusCode.INTERNAL_SERVER_ERROR)
      }

      // Remove from AURORAL platform
      unregisterLocaly = platformAns.filter((item) => item.statusCode === 200).map(it => it.oid)
      
      // Logout
      try {
        await gtwServices.doLogouts(unregisterLocaly, false)
      } catch (err: unknown) {
        const error = errorHandler(err)
        logger.error('Some logouts failed')
        logger.error(error.message)
      }

      // Remove from agent
      // Objects successfully removed from platform can be safely removed from local node
      try {
        await removeItem('registrations', unregisterLocaly)
        // Refresh configuration object with right number of registered items
        await persistance.updateConfigurationInfo()
      } catch (error) {
        throw new MyError('Error removing items locally, please try again', HttpStatusCode.INTERNAL_SERVER_ERROR)
      }
      
      const response = [...failed, ...platformAns]
      if (platformAns.filter(it => it.statusCode === 200).length === 0) {
        return responseBuilder(HttpStatusCode.BAD_REQUEST, res, null, response)
      } else {
        return responseBuilder(HttpStatusCode.OK, res, null, response)
      }
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

