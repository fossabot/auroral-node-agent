/**
Parsing middlewares
*/
import { v4 as uuidv4 } from 'uuid'
import { PreRegistration, RegistrationBody } from '../persistance/models/registrations'
import { Interaction, InteractionsEnum } from '../persistance/models/interactions'
import { getCountOfItems, getItem } from '../persistance/persistance'

// PUBLIC

export const tdParser = async (body : PreRegistration | PreRegistration[]): Promise<RegistrationBody[]> => {
    const itemsArray = Array.isArray(body) ? body : [body]
    // Check num registrations not over 100
    await _checkNumberOfRegistrations(itemsArray.length)
    // Create TDs array
    return Promise.all(
        itemsArray.map(
            async (it) => {
                return _buildTD(it) 
            }
        )
    )
}

// PRIVATE

const _buildTD = async (data: PreRegistration): Promise<RegistrationBody> => {
    _validate(data)
    const oid = uuidv4()
    const actions = data.actions ? await _checkInteractionPatterns(data.actions, InteractionsEnum.ACTIONS) : []
    const events = data.events ? await _checkInteractionPatterns(data.events, InteractionsEnum.EVENTS) : []
    const properties = data.properties ? await _checkInteractionPatterns(data.properties, InteractionsEnum.PROPERTIES) : []
    return Promise.resolve(
        { ...data, actions, events, properties, oid }
    )
}

const _checkInteractionPatterns = async (all_interactions: string[], type: InteractionsEnum): Promise<Interaction[]> => {
    const interactionsArray = []
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
    return interactionsArray
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
const _checkNumberOfRegistrations = async (newRegistrationsCount: number) => {
    const count = await getCountOfItems('registrations')
    if (count + newRegistrationsCount >= 100) {
        throw new Error('You have reached max number of registrations!')
    }
    return true
}
