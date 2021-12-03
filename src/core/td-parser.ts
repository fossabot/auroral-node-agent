/**
Parsing middlewares
*/
import { v4 as uuidv4 } from 'uuid'
import { Thing } from '../types/wot-types'
import { RegistrationJSON, RegistrationBody, RegistrationJSONBasic } from '../persistance/models/registrations'
import { getCountOfItems } from '../persistance/persistance'
import { wot } from '../microservices/wot'
import { errorHandler } from '../utils/error-handler'
import { logger } from '../utils'

// PUBLIC

export const tdParser = async (body : RegistrationJSONBasic | RegistrationJSONBasic[]): Promise<RegistrationBody[]> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    // Check num registrations not over 100
    await _checkNumberOfRegistrations(itemsArray.length)
    // Create TDs array
    return itemsArray.map(it => _buildTD(it))
}

export const tdParserWoT = async (body : Thing | Thing[]): Promise<RegistrationBody[]> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    await _checkNumberOfRegistrations(itemsArray.length)
    const items = await Promise.all(itemsArray.map(async it => {
            try {
                const oid = uuidv4()
                await wot.upsertTD(oid, { '@id': 'oid:' + oid, ...it })
                return _buildTDWoT(oid, it)
            } catch (err) {
                const error = errorHandler(err)
                logger.error(error.message)
                return null
            }
        })
    )
    return items.filter(it => it) as RegistrationBody[]
}

// PRIVATE

const _buildTD = (data: RegistrationJSONBasic): RegistrationBody => {
    _validate(data)
    const oid = uuidv4()
    return { 
        name: data.name,
        type: data.type,
        adapterId: data.adapterId, 
        oid, 
        labels: data.labels,
        avatar: data.avatar,
        groups: data.groups,
        properties: data.properties ? data.properties.toString() : undefined,
        actions: data.actions ? data.actions.toString() : undefined,
        events: data.events ? data.events.toString() : undefined
    }
}

const _buildTDWoT = (oid: string, data: Thing): RegistrationBody => {
    return {
        oid,
        properties: data.properties ? Object.keys(data.properties).toString() : undefined,
        actions: data.actions ? Object.keys(data.actions).toString() : undefined,
        events: data.events ? Object.keys(data.events).toString() : undefined,
        name: data.title,
        type: 'Device', // TBD: Force to only accepted until ready // data['@type'],
        adapterId: 'dummy' // TBD: Update this and add groupId or other props when ready
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
    if (!data.adapterId) {
        throw new Error('REGISTRATION ERROR: Missing adapterId')
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
