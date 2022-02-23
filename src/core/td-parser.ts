/**
Parsing middlewares
*/
import { v4 as uuidv4 } from 'uuid'
import { RegistrationBody,RegistrationUpdate, RegistrationJSON } from '../persistance/models/registrations'
import { getCountOfItems, getItem, existsAdapterId, sameAdapterId } from '../persistance/persistance'
import { wot } from '../microservices/wot'
import { errorHandler } from '../utils/error-handler'
import { logger } from '../utils'
import { RegistrationResultPost } from '../types/gateway-types'

// Types

type RegistrationRet = {
    registrations: RegistrationBody[],
    errors: RegistrationResultPost[]
}

// PUBLIC

export const tdParser = async (body : RegistrationJSON | RegistrationJSON[]): Promise<RegistrationRet> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    // Check num registrations not over 100
    await _checkNumberOfRegistrations(itemsArray.length)
    // Collect all adapterIDs
    const adapterIDs = itemsArray.map(it => it.adapterId).filter(it => it) as string[]
    // Create TDs array
    const registrations: RegistrationBody[] = []
    const errors: RegistrationResultPost[] = []
    for (let i = 0, l = itemsArray.length; i < l; i++) {
        try {
            // validate required properities
            _validate(itemsArray[i])
            // Check conflicts with adapterIDs
            await _lookForAdapterIdConflicts(itemsArray[i].adapterId, adapterIDs)
            // generate uuid 
            const oid = uuidv4()
            // get proper thing description
            registrations.push(_buildTD(oid, itemsArray[i]))
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            errors.push({ oid: itemsArray[i].adapterId || 'anonymous', name: itemsArray[i].name, error: error.message, password: null })
        }
    }
    return { registrations, errors }
}

export const tdParserWoT = async (body : RegistrationJSON | RegistrationJSON[]): Promise<RegistrationRet> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    await _checkNumberOfRegistrations(itemsArray.length)
    itemsArray.forEach(it => {
        if (!it.td) {
            throw new Error('Please include td')
        }
    })
    // Collect all adapterIDs
    const adapterIDs = itemsArray.map(it => it.adapterId).filter(it => it) as string[]
    const registrations: RegistrationBody[] = []
    const errors: RegistrationResultPost[] = []
    for (let i = 0, l = itemsArray.length; i < l; i++) {
        try {
            // Check conflicts with adapterIDs
            await _lookForAdapterIdConflicts(itemsArray[i].adapterId, adapterIDs)
            const oid = uuidv4()
            await wot.upsertTD(oid, { 'id': oid, ...itemsArray[i].td }) // WoT Validation
            registrations.push(_buildTDWoT(oid, itemsArray[i]))
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            errors.push({ oid: itemsArray[i].adapterId || 'anonymous', name: itemsArray[i].name, error: error.message, password: null })
        }
    }
    return { registrations, errors }
}

export const tdParserUpdate = async (body : RegistrationJSON | RegistrationJSON[]): Promise<RegistrationUpdate[]> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    const registrations = await getItem('registrations') as string[]
    // test if registered 
    itemsArray.forEach((item) => {
        if (item.oid !== undefined) {
            throw new Error('Missing OID for some objects')
        }
        if (!registrations.includes(item.oid!)) {
            throw new Error('Some objects are not registered [' + item.oid! + ']')
        }
    })
    const itemsUpdate = await Promise.all(itemsArray.map(
        async (it) => {
            try {
                // Check that adapterId does not change
                await sameAdapterId(it.oid!, it.adapterId!)
                // Get proper thing description
                return _buildTDUpdate(it.oid!, it)
            } catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return null
            }
        })
    )
    return itemsUpdate.filter(it => it) as RegistrationUpdate[]
}

export const tdParserUpdateWot = async (body : RegistrationJSON | RegistrationJSON []): Promise<RegistrationUpdate[]> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    const registrations = await getItem('registrations') as string[]
    // test if registered 
    itemsArray.forEach((item) => {
        if (!item.td) {
            throw new Error('Please provide td')
        }
        if (item.oid === undefined) {
            throw new Error('Some objects do not have OIDs')
        }
        if (!registrations.includes(item.oid)) {
            throw new Error('Some objects are not registered [' + item.oid + ']')
        }
    })
    const itemsUpdate = await Promise.all(itemsArray.map(
        async (it) => {
            try {
                // Check that adapterId does not change
                await sameAdapterId(it.oid!, it.adapterId!)
                // Get proper thing description
                await wot.upsertTD(it.oid!, { 'id': it.oid!, ...it.td }) // WoT Validation
                return _buildTDWoTUpdate(it.oid!, it!)
            } catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return null
            }
        })
    )
    return itemsUpdate.filter(it => it) as RegistrationUpdate[]
}

// PRIVATE

const _buildTD = (oid: string, data: RegistrationJSON): RegistrationBody => {
    return { 
        name: data.name,
        type: data.type,
        adapterId: data.adapterId ? data.adapterId : oid, 
        oid, 
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        properties: data.properties ? data.properties.toString() : undefined,
        actions: data.actions ? data.actions.toString() : undefined,
        events: data.events ? data.events.toString() : undefined
    }
}

const _buildTDWoT = (oid: string, data: RegistrationJSON): RegistrationBody => {
    return {
        oid,
        properties: data.td!.properties ? Object.keys(data.td!.properties).toString() : undefined,
        actions: data.td!.actions ? Object.keys(data.td!.actions).toString() : undefined,
        events: data.td!.events ? Object.keys(data.td!.events).toString() : undefined,
        name: data.td!.title,
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        type: data.type ? data.type : 'Device', // TBD: Force to only accepted until ready // data['@type'],
        adapterId: data.adapterId ? data.adapterId : oid // TBD: Update this and add groupId or other props when ready
    }
}

const _buildTDUpdate = (oid: string, data: RegistrationJSON): RegistrationUpdate => {
    return { 
        oid, 
        name: data.name,
        adapterId: data.adapterId ? data.adapterId : oid,
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        properties: data.properties ? data.properties : undefined,
        actions: data.actions ? data.actions : undefined,
        events: data.events ? data.events : undefined
    }
}
const _buildTDWoTUpdate = (oid: string, data: RegistrationJSON): RegistrationUpdate => {
    return { 
        oid,
        properties: data.td!.properties ? Object.keys(data.td!.properties) : undefined,
        actions: data.td!.actions ? Object.keys(data.td!.actions) : undefined,
        events: data.td!.events ? Object.keys(data.td!.events) : undefined,
        name: data.td!.title,
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        adapterId: data.adapterId ? data.adapterId : oid // TBD: Update this and add groupId or other
    }
}

/**
 * Check if all required parameters for registration are included
 * @param {object} data 
 */
const _validate = (data: RegistrationJSON) => {
    if (!data.name) {
        throw new Error('REGISTRATION ERROR: Missing name')
    }
    if (!data.type) {
        throw new Error('REGISTRATION ERROR: Missing type')
    }
}

/**
 * Check that number of local registrations stays below 100
 */
const _checkNumberOfRegistrations = async (newRegistrationsCount: number) => {
    const count = await getCountOfItems('registrations')
    if (count + newRegistrationsCount >= 100) {
        throw new Error('You have reached max number of registrations!')
    }
    return true
}

/**
 * Check for AdapterId conflicts during REGISTRATION
 */
const _lookForAdapterIdConflicts = async (adapterId: string | undefined, adapterIds: string[]) => {
    // If adapterID is undefined it will be the same as the OID so no conflicts can occur
    if (adapterId) {
        // Test if same AdapterId appear more than once in the same array of registrations
        const occurrences = adapterIds.reduce((a, v) => (v === adapterId ? a + 1 : a), 0)
        if (occurrences > 1) {
            throw new Error('REGISTRATION ERROR: Adapter ID cannot be duplicated')
        }
        // Test is same AdapterId already exists in the agent
        if (await existsAdapterId(adapterId)) {
            throw new Error('REGISTRATION ERROR: Adapter ID cannot be duplicated')
        }
    }
}
