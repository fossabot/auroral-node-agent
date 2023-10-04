/**
Parsing middlewares
*/
import { v4 as uuidv4 } from 'uuid'
import { RegistrationBody, UpdateBody, RegistrationJSON, UpdateJSONTD, UpdateJSON, RegistrationJSONTD } from '../persistance/models/registrations'
import { getCountOfItems, getItem, existsAdapterId, sameAdapterId } from '../persistance/persistance'
import { wot } from '../microservices/wot'
import { errorHandler, MyError } from '../utils/error-handler'
import { HttpStatusCode, logger } from '../utils'
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
    // check if all TDs are present
    itemsArray.forEach(it => {
        if (it.td === undefined) {
            throw new MyError('Please include td for all objects', HttpStatusCode.BAD_REQUEST)
        } 
    })
    // Collect all adapterIDs
    const adapterIDs = itemsArray.map(it => it.td.adapterId).filter(it => it) 
    const registrations: RegistrationBody[] = []
    const errors: RegistrationResultPost[] = []
    for (let i = 0, l = itemsArray.length; i < l; i++) {
        try {
            const it = itemsArray[i]
            // Early WoT Validation
            _wot_validate(it)
            // Verify interactions are not duplicated, URIencode and standardize some attributes as []
            it.td = _standardize_td(it.td)
            // Check conflicts with adapterIDs
            await _lookForAdapterIdConflicts(it.td.adapterId, adapterIDs)
            const oid = uuidv4()
            // enrich TD if PROXY mode
            if (Config.ADAPTER.MODE === AdapterMode.PROXY) {
                it.td = tdProxyEnrichment({ 'id': oid, ...it.td })
            }
            // Create thingDesc
            const thing = new Thing({ 'id': oid, ...it.td })
            // Validate if all fields mandatory are included, depending on the type
            validateTypeConstraints(thing)
            // Register ThingDesc
            await wot.upsertTD(oid, thing) // WoT Validation
            registrations.push(_buildTDWoT(oid, it))
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
    const updates: UpdateBody[] = []
    const errors: UpdateResult[] = []
    for (let i = 0, l = itemsArray.length; i < l; i++) {
        const it = itemsArray[i]
        try {
            // Early validation
            _wot_validate_update(it, registrations)
            const oldTD = await (await wot.retrieveTD(it.td.id!)).message
            if (!oldTD) {
                throw new MyError('Old TD not found')
            }
            // Verify iid are not duplicated (unique pids, aids and eids) + generate new (if necessary)
            it.td = _standardize_td(it.td)
            // If adapterId = undefined, use old one
            it.td.adapterId = it.td.adapterId ? it.td.adapterId : oldTD.adapterId 
            // Check that adapterId does not change
            await sameAdapterId(it.td.id!, it.td.adapterId)
            // enrich TD if PROXY mode
             if (Config.ADAPTER.MODE === AdapterMode.PROXY) {
                it.td = tdProxyEnrichment(it.td)
            }
            // Create thing
            const thing = new Thing(it.td)
            // Validate if all fields mandatory are included, depending on the type
            validateTypeConstraints(thing)
            // Get proper thing description
            await wot.upsertTD(it.td.id!, thing) // WoT Validation
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
    // valid types 
    const validTypes = ['device', 'service'] //, 'dataset']
    // get iids  
    let type: string = Array.isArray(data.td['@type']) ? data.td['@type'][0] : data.td['@type']
    if (!type) {
        type = 'Device'
    }
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
        type: validTypes.indexOf(type.toLowerCase()) !== -1 ? type : 'Device', // Check if valid type, otherwise Device
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

const _wot_validate = (it: RegistrationJSONTD) => {
        if (!it.td) {
            throw new Error('Item does not have td')
        }
        if (!it.td.title) {
            throw new Error('Item does not have title')
        }
        if (it.td.oid) {
            throw new Error('OID property is not allowed during registration')
        }
        if (it.td.id) {
            throw new Error('ID property is not allowed during registration')
        }
        // AdapterID regex check
        // Allow only alphanumeric and  hyphen
        if (it.td.adapterId && !it.td.adapterId.match(/^[a-zA-Z0-9-]+$/)) {
            throw new Error('AdapterID can only contain alphanumeric characters and hyphen')
        }
}

const _wot_validate_update = (item: RegistrationJSONTD, registrations: string[]) => {
        if (!item.td) {
            throw new Error('Please provide td')
        }
        if (!item.td.id) {
            throw new Error('Some objects do not have ID property')
        }
        if (!registrations.includes(item.td.id)) {
            throw new Error('Item not registered [' + item.td.id + ']')
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
 * All interaction ids must have id
 * @param td 
 * @returns td
 */
 const _standardize_td = (td: Thing): Thing => {
    // EncodeURI interactions
    const properties = td.properties
    const events = td.events
    const actions = td.actions
    td.properties = {}
    td.events = {}
    td.actions = {}
    if (properties) {
        for (const [key, value] of Object.entries(properties)) {
            // URI encode prop names
            td.properties[encodeURI(key)] = value
            // standardize parameters (as array)
            // if (td.properties[encodeURI(key)].monitors && !Array.isArray(td.properties[encodeURI(key)].monitors)) {
            //     td.properties[encodeURI(key)].monitors = [td.properties[encodeURI(key)].monitors! as string]
            // }
            // if (td.properties[encodeURI(key)].parameters && !Array.isArray(td.properties[encodeURI(key)].parameters)) {
            //     td.properties[encodeURI(key)].parameters = [td.properties[encodeURI(key)].parameters! as string]
            // }
            // if (td.properties[encodeURI(key)].measures && !Array.isArray(td.properties[encodeURI(key)].measures)) {
            //     td.properties[encodeURI(key)].measures = [td.properties[encodeURI(key)].measures! as string]
            // }
        }
    }
    if (events) {
        for (const [key, value] of Object.entries(events)) {
            // URI encode event names
            td.events[encodeURI(key)] = value
            // if (td.events[encodeURI(key)].monitors && !Array.isArray(td.events[encodeURI(key)].monitors)) {
            //     td.events[encodeURI(key)].monitors = [td.events[encodeURI(key)].monitors! as string]
            // }
            // if (td.events[encodeURI(key)].measures && !Array.isArray(td.events[encodeURI(key)].measures)) {
            //     td.events[encodeURI(key)].measures = [td.events[encodeURI(key)].measures! as string]
            // }
        }
    }
    if (actions) {
        for (const [key, value] of Object.entries(actions)) {
            // URI encode action names
            td.actions[encodeURI(key)] = value
            // if (td.actions[encodeURI(key)].monitors && !Array.isArray(td.actions[encodeURI(key)].monitors)) {
            //     td.actions[encodeURI(key)].monitors = [td.actions[encodeURI(key)].monitors! as string]
            // }
            // if (td.actions[encodeURI(key)].measures && !Array.isArray(td.actions[encodeURI(key)].measures)) {
            //     td.actions[encodeURI(key)].measures = [td.actions[encodeURI(key)].measures! as string]
            // }
        }
    }

    // test for uniqness
    _unique_iids(td)
    return td
}

/**
 * All interaction ids must be unique
 * Also across different interaction types
 * @param td 
 */
 const _unique_iids = (td: Thing): void => {
    // NAMES
    const properties = td.properties ? Object.keys(td.properties) : []
    const events = td.events ? Object.keys(td.events) : []
    const actions = td.actions ? Object.keys(td.actions) : []
    const interactions = [...properties, ...events, ...actions]
    const repeated = [...new Set(interactions.filter((value, index, self) => self.indexOf(value) !== index))]
    if (repeated.length > 0) {
        throw new Error('Thing Description has repeated interaction names: ' + repeated.join())
    }
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
 * Validate that all the constraints for a given type appear in the document
 * @param thing 
 */
const validateTypeConstraints = (thing: Thing): void => {
    const validDomains = ['energy', 'health', 'farming', 'mobility', 'dairy farming', 'tourism', 'weather', 'indoor quality', 'circular economy']
    const type: string[] = Array.isArray(thing['@type']) ? thing['@type'] : [thing['@type']]
    // Contraints for dataset
    const isdataset = type.map(it => it.toLowerCase() === 'dataset').reduce((acc,it) => acc + Number(it), 0)
    if (isdataset >= 1) {
        if (!thing.title) { 
            throw new MyError('Missing title in type dataset', HttpStatusCode.BAD_REQUEST)
        }
        if (!thing.description && !thing.descriptions) { 
            throw new MyError('Missing description in type dataset', HttpStatusCode.BAD_REQUEST)
        }
        if (!thing.domain) { 
            throw new MyError('Missing domain in type dataset')
        } else {
            if (validDomains.indexOf(thing.domain.toLowerCase()) === -1) {
                throw new MyError('Invalid domain in type dataset, valid domains are ' + validDomains, HttpStatusCode.BAD_REQUEST)
            }
        }
        if (!thing.url) { 
            throw new MyError('Missing url in type dataset', HttpStatusCode.BAD_REQUEST)
        } else {
            // throws error to upper try catch if not valid URL
            try {
                const validUrl = new URL(thing.url)
            } catch (err: unknown) {
                throw new MyError('Invalid URL for TD of type dataset', HttpStatusCode.BAD_REQUEST)
            }
        }
    }
}
