/**
 * Gateway services
 * Implements support functionality
 */

 import { v4 as uuidv4 } from 'uuid'
import { Interaction, InteractionsEnum } from '../persistance/models/interactions'
import { logger } from '../utils'
import { gateway } from '../microservices/gateway'
import { getCountOfItems, getItem, addItem, removeItem } from '../persistance/persistance'
import { RegistrationResultPost } from '../types/gateway-types'
import { Registration, PreRegistration, RegistrationBody } from '../persistance/models/registrations'
import { Config } from '../config'

const INTERACTIONS = {
    'properties': { 'id': 'pid', 'does': 'monitors' },
    'actions': { 'id': 'aid', 'does': 'affects' },
    'events': { 'id': 'eid', 'does': 'monitors' }
}

export const gtwServices = {
    doLogins: async (array: string[]): Promise<void> => {
        try {
            await gateway.login() // Start always the gateway first
            array.forEach(async (it) => {
                try {
                    await gateway.login(it)
                } catch (error) {
                    logger.error('Item ' + it + ' could not be logged in')
                    logger.error(error.message)
                }
            })
        } catch (err) {
            logger.error(err.message)
        }
    },
    doLogouts: async (array: string[]): Promise<void> => {
        try {
            array.forEach(async (it) => {
                try {
                    await gateway.logout(it)
                } catch (error) {
                    logger.error('Item ' + it + ' could not be logged out')
                    logger.error(error.message)
                }
            })
            await gateway.logout() // Stop always the gateway last
            logger.info('All logouts were successful', 'AGENT')
        } catch (err) {
            logger.error(err.message)
        }
    },
    /**
     * Register object in platform
     * Only 1 by 1 - No multiple registration accepted
     */
    registerObject: async (body: PreRegistration | PreRegistration[]): Promise<RegistrationResultPost[]> => {
        try {
            const itemsArray = Array.isArray(body) ? body : [body]
            const items = await Promise.all(itemsArray.map(async (it) => {
                return buildTD(it) 
            }))
            const result = await gateway.postRegistrations({
                agid: Config.GATEWAY.ID,
                items
            })
            if (result.error) {
                throw new Error('Platform parsing failed, please revise error: ' + JSON.stringify(result.message[0].error))
            }
            result.message.forEach(async (it) => {
                if (!it.error && it.password) {
                    try {
                        const td = items.filter(x => x.oid === it.oid)
                        await storeRegistration(
                            { 
                                ...td[0], 
                                oid: it.oid,
                                password: it.password,
                                credentials: 'Basic ' + Buffer.from(it.oid + ':' + it.password, 'utf-8').toString('base64')
                            })
                        // Login new objects
                        await gateway.login(it.oid)
                        logger.info(it.name + ' with oid ' + it.oid + ' successfully registered!')
                    } catch (error) {
                        logger.warn(it.name + ' with oid ' + it.oid + ' had a registration issue...')
                        logger.error(error.message)
                    }
                } else {
                    logger.warn(it.name + ' with oid ' + it.oid + ' could not be registered...')
                }
            })
            return Promise.resolve(result.message)
        } catch (err) {
            return Promise.reject(err)
        }
    },
    /**
    * Remove object from platform
    */
    removeObject: async (body: { oids: string[] }) => {
        try {
            const wrapper = {
                agid: Config.GATEWAY.ID,
                oids: body.oids
            }
            const result = await gateway.removeRegistrations(wrapper)
            await removeRegistrations(body.oids)
            logger.info(result)
            return Promise.resolve('Successful deregistration')
        } catch (err) {
            return Promise.reject(err)
        }
    },
    /**
     * Compare Local infrastracture with platform
     * Both should have the same objects registered
     */
    compareLocalAndRemote: (local: string[], platform: { id: { info: { oid: string } } }[]) => {
        try {
            const oidArray = platform.map((item) => {
                return item.id.info.oid 
            })
            for (let i = 0, l = local.length; i < l; i++) {
                if (oidArray.indexOf(local[i]) === -1) {
                    throw new Error('Local and platform objects are not the same')
                }
            }
            logger.info('Local and platform objects match!', 'AGENT')
            return true
        } catch (err) {
            logger.warn(err, 'AGENT')
            return false
        }
    }
}

// Private functions

const buildTD = async (data: PreRegistration): Promise<RegistrationBody> => {
    try {
        await _checkNumberOfRegistrations()
        _validate(data)
        const oid = uuidv4()
        const actions = data.actions ? await _checkInteractionPatterns(data.actions, InteractionsEnum.ACTIONS) : []
        const events = data.events ? await _checkInteractionPatterns(data.events, InteractionsEnum.EVENTS) : []
        const properties = data.properties ? await _checkInteractionPatterns(data.properties, InteractionsEnum.PROPERTIES) : []
        return Promise.resolve(
            { ...data, actions, events, properties, oid }
        )
    } catch (err) {
        return Promise.reject(err)
    }
}

const _checkInteractionPatterns = async (all_interactions: string[], type: InteractionsEnum) => {
    const interactionsArray = []
    try {
        if (!Array.isArray(all_interactions)) {
            throw new Error(`REGISTRATION ERROR: ${type} is not a valid array`)
        }
        const uniqueInteractions = [...new Set(all_interactions)] // Ensure interaction ids registered are unique 
        for (let i = 0, l = uniqueInteractions.length; i < l; i++) {
            const aux = await getItem(type, uniqueInteractions[i]) as Interaction
            if (aux == null) {
                throw new Error(`REGISTRATION ERROR: Interaction: ${uniqueInteractions[i]} could not be found in ${type}`)
            } 
            interactionsArray.push(aux)
        }
        return Promise.resolve(interactionsArray)
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * Check if all required parameters for registration are included
 * @param {object} data 
 */
const _validate = (data: PreRegistration) => {
    if (!data.name) {
        throw new Error('REGISTRATION ERROR: Missing name')
    }
    if (!data.type) {
        throw new Error('REGISTRATION ERROR: Missing type')
    }
    if (!data.adapterId) {
        throw new Error('REGISTRATION ERROR: Missing adapterId')
    }
}

/**
 * Check that number of local registrations stays below 100
 */
const _checkNumberOfRegistrations = async () => {
    try {
        const count = await getCountOfItems('registrations')
        if (count >= 100) {
throw new Error('You have reached max number of registrations!')
}
        return Promise.resolve(true)
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * Return only pid/aid/eid of interactions
 * @param {array} array 
 */
const _getInteractionId = (array: string[], type: InteractionsEnum) => {
    const id = INTERACTIONS[type].id as any // Use any as workaround to error with index
    const result = []
    for (let i = 0, l = array.length; i < l; i++) {
        result.push(array[i][id])
    }
    return result
}

/**
 * Receives newly registered object in the platform
 * They need to be added to the agent too
 * @param {object} registration
 */
const storeRegistration = async (registration: Registration) => {
    try {
        await addItem('registrations', registration)
        return Promise.resolve(true)
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * Receives all oids that were removed form the platform
 * They need to be removed from the agent too
 * @param {array} unregistrations 
 */
    const removeRegistrations = async (unregistrations: string[]) => {
    try {
        await removeItem('registrations', unregistrations) // Remove from memory unregistered objects
        return Promise.resolve(true)
    } catch (err) {
        return Promise.reject(err)
    }
}
