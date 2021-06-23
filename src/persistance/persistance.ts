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
export const loadConfigurationFile = async (type: RegistrationOrInteractionEnum): Promise<Registration[] | Interaction[] | []> => {
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
 export const saveConfigurationFile = async (type: RegistrationOrInteractionEnum): Promise<boolean> => {
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
 export const addItem = async (type: RegistrationOrInteractionEnum, data: RegistrationOrInteractionBody): Promise<boolean> => {
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
 export const removeItem = async (type: RegistrationOrInteractionEnum, ids: string | string[]): Promise<boolean> => {
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
 export const getItem = async (type: RegistrationOrInteractionEnum, id?: string): Promise<Registration | Interaction | string[]>  => {
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
 export const getCountOfItems = async (type: RegistrationOrInteractionEnum): Promise<number> => {
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

// Useful functionalities

/**
 * Get credentials for one OID;
 * From memory;
 * on error rejects boolean false;
 * @async
 * @param {string} oid
 * @returns string
 */
export const getCredentials = async (oid: string) => {
    try { 
        const credentials = await redisDb.hget(oid, 'credentials')
        return Promise.resolve(credentials)
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * Check if incoming request is valid;
 * Oid exists in infrastructure and has pid;
 * on error rejects error object;
 * @async
 * @param {string} oid
 * @param {string} pid
 * @param boolean
 */
export const combinationExists = async (oid: string, pid: string) => {
    try {
        const exists = await redisDb.sismember('registrations', oid)
        if (!exists) {
            throw new Error(`Object ${oid} does not exist in infrastructure`)
        }
        const type = await redisDb.hget(oid, 'type')
        const properties = await redisDb.hget(oid, 'properties')
        if (type !== 'core:Service') {
            const p = properties != null ? properties.split(',') : []
            if (p.indexOf(pid) === -1) {
                throw new Error(`Object ${oid} does not have property ${pid}`)
            }
        }
        return Promise.resolve(true)
    } catch (err) {
        return Promise.reject(err)
    }    
}

// Configuration info MANAGEMENT

/**
 * Store configuration information;
 * Needs to be removed first;
 * on error rejects error string;
 * @async
 * @returns boolean
 */
export const reloadConfigInfo = async function() {
    try { 
        await removeConfigurationInfo()
        await addConfigurationInfo()
        return Promise.resolve(true)
    } catch (err) {
        throw new Error('Problem storing configuration information...')
    }
}

/**
 * Get configuration information;
 * From memory;
 * on error rejects error string;
 * @async
 * @returns object
 */
module.exports.getConfigInfo = async function() {
    try {
        await removeConfigurationInfo()
        await addConfigurationInfo()
        const result = await redisDb.hgetall('configuration')
        return Promise.resolve(result)
    } catch (err) {
        logger.error(err.message, 'PERSISTANCE')
        throw new Error('Problem storing configuration information...')
    }
}

// CACHE

/**
 * Add property request to cache
 * Support for caching incoming requests
 * on error resolves false;
 * @async
 * @param {string} key path requested
 * @param {string} data data requested
 * @returns boolean
 */
module.exports.addToCache = async function(key: string, data: string) {
    try {
        redisDb.caching(key, data)
        return Promise.resolve(true)
    } catch (err) {
        return Promise.reject(err)
    }
}

// System Health

/**
 * Check Redis availability
 * on error resolves false;
 * @async
 * @returns string
 */
module.exports.redisHealth = async function() {
    try {
        await redisDb.health()
        return Promise.resolve('OK')
    } catch (err) {
        return Promise.resolve(false)
    }
}

// Private functions

const determineIfIsRegistration = (toBeDetermined: RegistrationOrInteractionBody): toBeDetermined is Registration => {
    if ((toBeDetermined as Registration).type) {
      return true
    }
    return false
  }

  /**
 * Adds configuration of agent info
 * To memory
 */
const addConfigurationInfo = async () => {
    try { 
        const d = new Date()
        const numregis = await redisDb.scard('registrations')
        const numprops = await redisDb.scard('properties')
        const numactions = await redisDb.scard('actions')
        const numevents = await redisDb.scard('events')
        await redisDb.hset('configuration', 'date', d.toISOString())
        await redisDb.hset('configuration', 'registrations', String(numregis))
        await redisDb.hset('configuration', 'properties', String(numprops))
        await redisDb.hset('configuration', 'actions', String(numactions))
        await redisDb.hset('configuration', 'events', String(numevents))
        return Promise.resolve(true)
    } catch (err) {
        return Promise.reject(err)
    }
}

 /**
 * Removes configuration of agent info
 * From memory
 */
const removeConfigurationInfo = async () => {
    try { 
        await redisDb.hdel('configuration', 'date')
        await redisDb.hdel('configuration', 'registrations')
        await redisDb.hdel('configuration', 'properties')
        await redisDb.hdel('configuration', 'actions')
        await redisDb.hdel('configuration', 'events')
        return Promise.resolve(true)
    } catch (err) {
        return Promise.reject(err)
    }
}
