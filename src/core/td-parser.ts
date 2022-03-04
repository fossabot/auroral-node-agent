/**
Parsing middlewares
*/
import { v4 as uuidv4 } from 'uuid'
import { RegistrationBody, UpdateBody, RegistrationJSON, UpdateJSONTD, UpdateJSON, RegistrationJSONTD } from '../persistance/models/registrations'
import { getCountOfItems, getItem, existsAdapterId, sameAdapterId } from '../persistance/persistance'
import { wot } from '../microservices/wot'
import { errorHandler } from '../utils/error-handler'
import { logger } from '../utils'
import { RegistrationResultPost } from '../types/gateway-types'
import { UpdateResult } from '../types/misc-types'

// Types

type RegistrationRet = {
    registrations: RegistrationBody[],
    errors: RegistrationResultPost[]
}

type UpdateRet = {
    updates: UpdateBody[],
    errors: UpdateResult[]
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

export const tdParserWoT = async (body : RegistrationJSONTD | RegistrationJSONTD[]): Promise<RegistrationRet> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    await _checkNumberOfRegistrations(itemsArray.length)
    itemsArray.forEach(it => {
        if (!it.td) {
            throw new Error('Please include td')
        }
    })
    // Collect all adapterIDs
    const adapterIDs = itemsArray.map(it => it.td.adapterId).filter(it => it) as string[]
    const registrations: RegistrationBody[] = []
    const errors: RegistrationResultPost[] = []
    for (let i = 0, l = itemsArray.length; i < l; i++) {
        try {
            // Check conflicts with adapterIDs
            await _lookForAdapterIdConflicts(itemsArray[i].td.adapterId, adapterIDs)
            const oid = uuidv4()
            await wot.upsertTD(oid, { 'id': oid, ...itemsArray[i].td }) // WoT Validation
            registrations.push(_buildTDWoT(oid, itemsArray[i]))
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            errors.push({ oid: itemsArray[i].td.adapterId || 'anonymous', name: itemsArray[i].td?.title || 'anonymous', error: error.message, password: null })
        }
    }
    return { registrations, errors }
}

export const tdParserUpdate = async (body : UpdateJSON | UpdateJSON[]): Promise<UpdateRet> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    const registrations = await getItem('registrations') as string[]
    // test if registered 
    itemsArray.forEach((item) => {
        if (item.oid === undefined) {
            throw new Error('Missing OID for some objects')
        }
        if (!registrations.includes(item.oid)) {
            throw new Error('Some objects are not registered [' + item.oid + ']')
        }
    })
    const updates: UpdateBody[] = []
    const errors: UpdateResult[] = []
    for (let i = 0, l = itemsArray.length; i < l; i++) {
        const it = itemsArray[i]
        try {
            // Check that adapterId does not change
            await sameAdapterId(it.oid, it.adapterId)
            // Get proper thing description
            updates.push(_buildTDUpdate(it.oid, it))
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            errors.push({ oid: it.oid, error: error.message })
        }
    }
    return { updates, errors }
}

export const tdParserUpdateWot = async (body : UpdateJSONTD | UpdateJSONTD[]): Promise<UpdateRet> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    const registrations = await getItem('registrations') as string[]
    // test if registered 
    itemsArray.forEach((item) => {
        if (!item.td) {
            throw new Error('Please provide td')
        }
        if (!item.td.id) {
            throw new Error('Some objects do not have OIDs')
        }
        if (!registrations.includes(item.td.id)) {
            throw new Error('Some objects are not registered [' + item.td.id + ']')
        }
    })
    const updates: UpdateBody[] = []
    const errors: UpdateResult[] = []
    for (let i = 0, l = itemsArray.length; i < l; i++) {
        const it = itemsArray[i]
        try {
            // Check that adapterId does not change
            await sameAdapterId(it.td.id!, it.td.adapterId)
            // Get proper thing description
            await wot.upsertTD(it.td.id!, it.td) // WoT Validation
            updates.push(_buildTDWoTUpdate(it.td.id!, it))
        } catch (err) {
            const error = errorHandler(err)
            logger.error(error.message)
            errors.push({ oid: it.td.id!, error: error.message })
        }
    }
    return { updates, errors }
}

// PRIVATE

const _buildTD = (oid: string, data: RegistrationJSON): RegistrationBody => {
    return { 
        name: data.name,
        type: data.type ? data.type : 'Device',
        adapterId: data.adapterId ? data.adapterId : oid, 
        oid, 
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        description: data.description,
        properties: data.properties ? data.properties.toString() : undefined,
        actions: data.actions ? data.actions.toString() : undefined,
        events: data.events ? data.events.toString() : undefined
    }
}

const _buildTDWoT = (oid: string, data: RegistrationJSONTD): RegistrationBody => {
    return {
        oid,
        properties: data.td.properties ? Object.keys(data.td.properties).toString() : undefined,
        actions: data.td.actions ? Object.keys(data.td.actions).toString() : undefined,
        events: data.td.events ? Object.keys(data.td.events).toString() : undefined,
        name: data.td.title,
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        description: data.td.description,
        type: 'Device', // TBD: Force to only accepted until ready // data['@type'],
        adapterId: data.td.adapterId ? data.td.adapterId : oid // TBD: Update this and add groupId or other props when ready
    }
}

const _buildTDUpdate = (oid: string, data: UpdateJSON): UpdateBody => {
    return { 
        oid, 
        name: data.name,
        adapterId: data.adapterId ? data.adapterId : oid,
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        description: data.description,
        properties: data.properties ? data.properties.toString() : undefined,
        actions: data.actions ? data.actions.toString() : undefined,
        events: data.events ? data.events.toString() : undefined
    }
}

const _buildTDWoTUpdate = (oid: string, data: UpdateJSONTD): UpdateBody => {
    return { 
        oid,
        properties: data.td.properties ? Object.keys(data.td.properties).toString() : undefined,
        actions: data.td.actions ? Object.keys(data.td.actions).toString() : undefined,
        events: data.td.events ? Object.keys(data.td.events).toString() : undefined,
        name: data.td.title,
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        description: data.td.description,
        adapterId: data.td.adapterId ? data.td.adapterId : oid // TBD: Update this and add groupId or other
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
