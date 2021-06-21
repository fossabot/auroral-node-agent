/**
* Persistance interface
* Interface to interact with the persistance layer services
* @interface
*/ 

import { logger } from '../utils/logger'
import { redisDb } from './redis'
import { fileSystem } from './fileMgmt'
import { Interaction, interactionFuncs, InteractionsEnum } from './models/interactions'
import { registrationFuncs, Registration } from './models/registrations'
import { Config } from '../config'

// Constants

type RegistrationsType = 'registrations'
const REGISTRATIONS: RegistrationsType = 'registrations' 
type RegistrationOrInteractionBody = Registration | Interaction
type RegistrationOrInteractionEnum = InteractionsEnum | RegistrationsType

// Import/Export data to/from persistance

/**
 * Import configuration files to memory;
 * Does not overwrite, only loads interactions or registrations not existing previously;
 * NOTE: Use delete endpoints of API to remove old interactions or registrations;
 * on ENOENT error resolves an empty array;
 * on unexpected error resolves a boolean;
 * @async 
 * @param {string} type 
 * @returns array
 */  
export const loadConfigurationFile = async function(type: RegistrationOrInteractionEnum): Promise<Registration[] | Interaction[] | []> {
    try { 
        const file = await fileSystem.read(`${Config.HOME_PATH}/agent/imports/${type}.json`)
        const array = JSON.parse(file)
        const countRows = array.length
        if (countRows > 0) {
            if (type === REGISTRATIONS) {
                await registrationFuncs.storeInMemory(array)
            } else {
                await interactionFuncs.storeInMemory(array, type)
            }
            logger.info(`File ${type}.json, loaded ${countRows} elements`)
            return Promise.resolve(array)
        } else {
            logger.info(`There are no ${type} available to load`)
            return Promise.resolve(array)
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            logger.warn(`File ${type}.json not found`)
            return Promise.resolve([])
        } else {
            logger.error(err.message)
            return Promise.reject(err)
        }
    }
}

/**
 * Exports to file some hash stored in memory;
 * Additional backup possibility;
 * on error rejects boolean false;
 * @async
 * @param {string} type 
 * @returns boolean
 */
 export const saveConfigurationFile = async function(type: RegistrationOrInteractionEnum): Promise<boolean> {
    try { 
        let data
        if (type === REGISTRATIONS) {
            data = await registrationFuncs.loadFromMemory()
        } else {
            data = await interactionFuncs.loadFromMemory(type)
        }
        await fileSystem.write(`${Config.HOME_PATH}/agent/exports/${type}.json`, JSON.stringify(data))
        return Promise.resolve(true)
    } catch (err) {
        logger.error(err.message)
        return Promise.resolve(false)
    }
}

// Work with data models in DB

/**
 * Add item to db
 * @async
 * @param {string} type 
 * @param {object} data 
 * @returns boolean 
 */
 module.exports.addItem = async function(type: RegistrationOrInteractionEnum, data: RegistrationOrInteractionBody): Promise<boolean> {
    try {
        let result
        if (type === REGISTRATIONS && determineIfIsRegistration(data)) {
            result = await registrationFuncs.addItem(data)
        } else if (type !== REGISTRATIONS) {
            result = await interactionFuncs.addItem(data as Interaction, type)
        } else {
            throw new Error('Wrong type')
        }
        return Promise.resolve(result)
    } catch (err) {
        logger.error(err.message)
        return Promise.reject(err)
    }
}

/**
 * Remove item from db
 * @async
 * @param {string} type 
 * @param {string} id 
 * @returns boolean  
 */
module.exports.removeItem = async function(type: RegistrationOrInteractionEnum, ids: string | string[]): Promise<boolean> {
    try {
        let result
        if (type === REGISTRATIONS) {
            result = await registrationFuncs.removeItem(ids)
        } else {
            result = await interactionFuncs.removeItem(ids, type)
        }
        return Promise.resolve(result)
    } catch (err) {
        logger.error(err.message)
        return Promise.reject(err)
    }
}

/** 
 * Get item from db;
 * Returns object if ID provided;
 * Returns array of ids if ID not provided;
 * @async
 * @param {string} type 
 * @param {string} id [OPTIONAL]
 * @returns object 
 */
module.exports.getItem = async function(type: RegistrationOrInteractionEnum, id?: string): Promise<Registration | Interaction | string[]>  {
    try {
        let result
        if (type === REGISTRATIONS) {
            result = await registrationFuncs.getItem(id)
        } else {
            result = await interactionFuncs.getItem(type, id)
        }
        return Promise.resolve(result)
    } catch (err) {
        logger.error(err.message)
        return Promise.reject(err)
    }
}

/**
 * Get count of items in model stored in db
 * @async
 * @param {string} type
 * @returns integer
 */
module.exports.getCountOfItems = async function(type: RegistrationOrInteractionEnum): Promise<number> {
    try {
        let result
        if (type === REGISTRATIONS) {
            result = await registrationFuncs.getCountOfItems()
        } else {
            result = await interactionFuncs.getCountOfItems(type)
        }
        return Promise.resolve(result)
    } catch (err) {
        logger.error(err.message)
        return Promise.reject(err)
    }
}

// Private functions

const determineIfIsRegistration = (toBeDetermined: RegistrationOrInteractionBody): toBeDetermined is Registration => {
    if ((toBeDetermined as Registration).type) {
      return true
    }
    return false
  }
