/**
Parsing middlewares
*/
import { v4 as uuidv4 } from 'uuid'
import { RegistrationJSON, RegistrationBody } from '../persistance/models/registrations'
import { getCountOfItems } from '../persistance/persistance'

// PUBLIC

export const tdParser = async (body : RegistrationJSON | RegistrationJSON[]): Promise<RegistrationBody[]> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    // Check num registrations not over 100
    await _checkNumberOfRegistrations(itemsArray.length)
    // Create TDs array
    return itemsArray.map(it => _buildTD(it))
}

// PRIVATE

const _buildTD = (data: RegistrationJSON): RegistrationBody => {
    _validate(data)
    const oid = uuidv4()
    return { 
        ...data, 
        oid, 
        properties: data.properties ? data.properties.toString() : undefined,
        actions: data.actions ? data.actions.toString() : undefined,
        events: data.events ? data.events.toString() : undefined
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
