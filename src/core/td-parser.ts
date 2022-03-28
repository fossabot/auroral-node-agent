/**
Parsing middlewares
*/
import { v4 as uuidv4 } from 'uuid'
import { RegistrationBody, UpdateBody, RegistrationJSON, UpdateJSONTD, UpdateJSON, RegistrationJSONTD } from '../persistance/models/registrations'
import { getCountOfItems, getItem, existsAdapterId, sameAdapterId } from '../persistance/persistance'
import { wot } from '../microservices/wot'
import { errorHandler, MyError } from '../utils/error-handler'
import { logger } from '../utils'
import { RegistrationResultPost } from '../types/gateway-types'
import { AdapterMode, UpdateResult } from '../types/misc-types'
import { Thing } from '../types/wot-types'
import { tdProxyEnrichment } from './td-enrichment'
import { Config } from '../config'

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
            // Verify iid are not duplicated (unique pids, aids and eids), assing @ids
            itemsArray[i].td = _process_iids(itemsArray[i].td)
            // Check conflicts with adapterIDs
            await _lookForAdapterIdConflicts(itemsArray[i].td.adapterId, adapterIDs)
            const oid = uuidv4()
            // enrich TD if PROXY mode
            if (Config.ADAPTER.MODE === AdapterMode.PROXY) {
                itemsArray[i].td = tdProxyEnrichment({ 'id': oid, ...itemsArray[i].td })
            }
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
            const oldTD = await (await wot.retrieveTD(it.td.id!)).message
            if (!oldTD) {
                throw new MyError('Old TD not found')
            }
            // Verify iid are not duplicated (unique pids, aids and eids) + generate new (if necessary)
            it.td = await _process_iids_update(oldTD, it.td)
            // If adapterId = undefined, use old one
            it.td.adapterId = it.td.adapterId ? it.td.adapterId : oldTD.adapterId 
            // Check that adapterId does not change
            await sameAdapterId(it.td.id!, it.td.adapterId)
            // enrich TD if PROXY mode
             if (Config.ADAPTER.MODE === AdapterMode.PROXY) {
                it.td = tdProxyEnrichment(it.td)
            }
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
    // get iids  
    const properties = data.td.properties ? Object.entries(data.td.properties).map(item => item[1]['@id']).toString() : ''
    const actions = data.td.actions ? Object.entries(data.td.actions).map(item => item[1]['@id']).toString() : ''
    const events = data.td.events ? Object.entries(data.td.events).map(item => item[1]['@id']).toString() : ''
    return {
        oid,
        properties: properties.length > 0 ? properties : undefined,
        events: events.length > 0 ? events : undefined,
        actions: actions.length > 0 ? actions : undefined,
        name: data.td.title,
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        description: data.td.description,
        type: data.td['@type'] === 'Service' ? 'Service' : 'Device', // TBD: Everything Device for now (except service)
        adapterId: data.td.adapterId ? data.td.adapterId : oid // TBD: Update this and add groupId or other props when ready
    } as RegistrationBody
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
    const properties = data.td.properties ? Object.entries(data.td.properties).map(item => item[1]['@id']).toString() : ''
    const actions = data.td.actions ? Object.entries(data.td.actions).map(item => item[1]['@id']).toString() : ''
    const events = data.td.events ? Object.entries(data.td.events).map(item => item[1]['@id']).toString() : ''
    return { 
        oid,
        properties: properties.length > 0 ? properties : undefined,
        events: events.length > 0 ? events : undefined,
        actions: actions.length > 0 ? actions : undefined,
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

/**
 * All interaction ids must be unique
 * Also across different interaction types
 * @param td 
 */
const _unique_iids = (td: Thing): void => {
    // IID
    const properties = td.properties ? Object.entries(td.properties).map(item => item[1]['@id']) : []
    const events = td.events ?  Object.entries(td.events).map(item => item[1]['@id']) : []
    const actions = td.actions ?  Object.entries(td.actions).map(item => item[1]['@id']) : []
    const interactions = [...properties, ...events, ...actions]
    const repeated = [...new Set(interactions.filter((value, index, self) => self.indexOf(value) !== index))]
    if (repeated.length > 0) {
        throw new Error('Thing Description has repeated interaction names: ' + repeated.join())
    }
    // NAMES
    const propertiesNames = td.properties ? Object.keys(td.properties) : []
    const eventsNames = td.events ? Object.keys(td.events) : []
    const actionsNames = td.actions ? Object.keys(td.actions) : []
    const interactionsNames = [...propertiesNames, ...eventsNames, ...actionsNames]
    const repeatedNames = [...new Set(interactionsNames.filter((value, index, self) => self.indexOf(value) !== index))]
    if (repeated.length > 0) {
        throw new Error('Thing Description has repeated interaction names: ' + repeated.join())
    }
}

/**
 * All interaction ids must have id
 * @param td 
 * @returns td
 */
 const _process_iids = (td: Thing): Thing => {
     // Add pids
    for (let i = 0; i < Object.keys(td.properties).length; i++) {
        td.properties[Object.keys(td.properties)[i]]['@id'] = uuidv4()
    }
     // Add eids
    for (let i = 0; i < Object.keys(td.events).length; i++) {
        td.events[Object.keys(td.events)[i]]['@id'] = uuidv4()
    }
     // Add aids
    for (let i = 0; i < Object.keys(td.actions).length; i++) {
        td.actions[Object.keys(td.actions)[i]]['@id'] = uuidv4()
    }
    _unique_iids(td)
    return td
}

/**
 * Compare IIDS and assing new to new interactions
 * @param mewTd 
 * @param oldTd
 * @returns td
 */
 const _process_iids_update = async (oldTd: Thing, newTd: Thing): Promise<Thing> => {
    // extract iids from old TD
    if (newTd.properties && Object.keys(newTd.properties).length > 0) { 
        const properties =  oldTd.properties ? Object.entries(oldTd.properties).map(item => item[1].id) : []
        // check propertiest in new TD 
        const newProperties = Object.keys(newTd.properties)
        for (let i = 0; i < newProperties.length; i++) {
            if (!newTd.properties[newProperties[i]]['@id'] || !properties.includes(newTd.properties[newProperties[i]]['@id'])) {
                newTd.properties[newProperties[i]]['@id'] = uuidv4()
            } 
        }
    }
    if (newTd.events && Object.keys(newTd.events).length > 0) {
        const events = oldTd.events ? Object.entries(oldTd.events).map(item => item[1].id) : []
        // check events in new TD 
        const newEvents = Object.keys(newTd.properties)
        for (let i = 0; i < newEvents.length; i++) {
            if (!newTd.events[newEvents[i]]['@id'] || !events.includes(newTd.events[newEvents[i]]['@id'])) {
                newTd.events[newEvents[i]]['@id'] = uuidv4()
            }
        }
    }
    if (newTd.actions && Object.keys(newTd.actions).length > 0) {
        const actions = oldTd.actions ? Object.entries(oldTd.actions).map(item => item[1].id) : []
        // check actions in new TD 
        const newActions = Object.keys(newTd.properties)
        for (let i = 0; i < newActions.length; i++) {
            if (!newTd.actions[newActions[i]]['@id'] ||  !actions.includes(newTd.actions[newActions[i]]['@id'])) {
                newTd.actions[newActions[i]]['@id'] = uuidv4()
            }
        }
    }
    _unique_iids(newTd)
    return newTd
}
