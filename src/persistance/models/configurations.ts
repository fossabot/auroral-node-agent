// Global packages
import { redisDb } from '../redis'

/**
 * Configuration
 * Holds config info about the node
 */

export type Configuration = {
    last_configuration_update: string
    last_privacy_update: string
    last_partners_update: string
    registrations: string
    // propierties: string
    // actions: string
    events: string
    cid: string
    organisation: string
    nodes: string
    partners: string
}

/**
 * Adds configuration of agent info
 * To memory
 */
export const addConfigurationInfo = async (cid: string, name: string, nodes: string[], partners: string[]): Promise<void> => {
    const d = new Date()
    const numregis = await redisDb.scard('registrations')
    // const numprops = await redisDb.scard('properties')
    // const numactions = await redisDb.scard('actions')
    // const numevents = await redisDb.scard('events')
    await redisDb.hset('configuration', 'last_configuration_update', d.toISOString())
    await redisDb.hset('configuration', 'last_partners_update', d.toISOString())
    await redisDb.hset('configuration', 'registrations', String(numregis))
    // await redisDb.hset('configuration', 'properties', String(numprops))
    // await redisDb.hset('configuration', 'actions', String(numactions))
    // await redisDb.hset('configuration', 'events', String(numevents))
    await redisDb.hset('configuration', 'cid', cid)
    await redisDb.hset('configuration', 'organisation', name)
    await redisDb.hset('configuration', 'nodes', String(nodes))
    await redisDb.hset('configuration', 'partners', String(partners))
}

/**
 * Update configuration of agent info
 * Only registrations
 */
 export const updateRegistrationsInfo = async (): Promise<void> => {
    const d = new Date()
    const numregis = await redisDb.scard('registrations')
    await redisDb.hset('configuration', 'last_configuration_update', d.toISOString())
    await redisDb.hset('configuration', 'registrations', String(numregis))
}

 /**
 * Removes configuration of agent info
 * From memory
 */
export const removeConfigurationInfo = async (): Promise<void> => {
        await redisDb.hdel('configuration', 'last_configuration_update')
        // await redisDb.hdel('configuration', 'date')
        await redisDb.hdel('configuration', 'registrations')
        // await redisDb.hdel('configuration', 'properties')
        // await redisDb.hdel('configuration', 'actions')
        // await redisDb.hdel('configuration', 'events')
    }
