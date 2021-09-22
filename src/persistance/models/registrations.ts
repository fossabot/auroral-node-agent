// Global packages
import { logger } from '../../utils/logger'
import { redisDb } from '../redis'
import { Interaction } from './interactions'
import { errorHandler } from '../../utils'

/**
 * registrations.js
 * registrations model
 * [registrations] list in REDIS contains registered OIDs
 * Each OID is a hash in REDIS with the following fields:
 * oid, type, credentials, password, adapterId, name, properties, events, agents
*/

// Body received by application
export interface PreRegistration {
    type: string
    adapterId: string
    name: string
    properties?: string[]
    events?: string[]
    actions?: string[]
    version?: string,
    description?: string,
    locatedIn?: string
}

// Body ready to register
export interface RegistrationBody {
    oid: string
    properties?: Interaction[]
    events?: Interaction[]
    actions?: Interaction[]
    type: string
    adapterId: string
    name: string
    version?: string,
    description?: string,
    locatedIn?: string
}

// Complete registration type after item is registered in NM
export interface Registration extends RegistrationBody {
    credentials: string
    password: string
}

export const registrationFuncs = {
    // Store array of whole model in db
    storeInMemory: async (array: Registration[]): Promise<void> => {
        await storeItems(array)
    },
    // Get array of whole model from db
    loadFromMemory: async (): Promise<Registration[]> => {
        const oids = await redisDb.smembers('registrations')
        const results: Registration[] = []
        oids.forEach(async (it) => {
            results.push(await redisDb.hgetall(it) as Registration)
        })
        return Promise.resolve(results)
    },
    // Add item to db
    addItem: async (data: Registration): Promise<void> => {
        await storeItems([data])
    },
    // Remove item from db
    removeItem: async (ids: string | string[]): Promise<void> => {
        if (typeof ids === 'string') {
            ids = [ids]
        }
        for (let i = 0, l = ids.length; i < l; i++) {
            const oid = ids[i]
            const todo = []
            todo.push(redisDb.srem('registrations', oid))
            todo.push(redisDb.hdel(oid, 'credentials'))
            todo.push(redisDb.hdel(oid, 'password'))
            todo.push(redisDb.hdel(oid, 'type'))
            todo.push(redisDb.hdel(oid, 'name'))
            todo.push(redisDb.hdel(oid, 'adapterId'))
            todo.push(redisDb.hdel(oid, 'properties'))
            todo.push(redisDb.hdel(oid, 'events'))
            todo.push(redisDb.hdel(oid, 'actions'))
            await Promise.all(todo)
        }
        // Persist changes to dump.rdb
        redisDb.save()
    },
    // Get item from db;
    // Returns object if ID provided;
    // Returns array of ids if ID not provided;
    getItem: async (id?: string): Promise<Registration | string[]> => {
        let result
        if (id) {
            result = await redisDb.hgetall(id) as Registration
            return Promise.resolve(result)
        } else {
            result = await redisDb.smembers('registrations')
            return Promise.resolve(result)
        }
    },
    // Get count of items in model stored in db
    getCountOfItems: async (): Promise<number> => {
        return redisDb.scard('registrations')
    }
}

// Private functions

const storeItems = async (array: Registration[]) => {
    for (let i = 0, l = array.length; i < l; i++) {
        const data = array[i]
        const todo = []
        if (!data.credentials || !data.password || !data.adapterId || !data.name || !data.type) {
            throw new Error(`Object with oid ${data.oid} misses some fields, its credentials could not be stored...`)
        }
        const exists = await redisDb.sismember('registrations', data.oid)
        if (!exists) {
            todo.push(redisDb.sadd('registrations', data.oid)) // Registrations array
            todo.push(redisDb.hset(data.oid, 'oid', data.oid))
            todo.push(redisDb.hset(data.oid, 'credentials', data.credentials))
            todo.push(redisDb.hset(data.oid, 'password', data.password))
            todo.push(redisDb.hset(data.oid, 'adapterId', data.adapterId))
            todo.push(redisDb.hset(data.oid, 'name', data.name))
            todo.push(redisDb.hset(data.oid, 'type', data.type))
            if (data.properties && data.properties.length) {
                todo.push(redisDb.hset(data.oid, 'properties', data.properties.toString()))
            }
            if (data.events && data.events.length) {
                todo.push(redisDb.hset(data.oid, 'events', data.events.toString()))
            }
            if (data.actions && data.actions.length) {
                todo.push(redisDb.hset(data.oid, 'actions', data.actions.toString()))
            }
            await Promise.all(todo)
        } else {
            logger.warn(`OID: ${data.oid} is already stored in memory.`)
        }
        // TBD: Activate event channels
        // if (data.events && data.events.length) {
            // await gateway.activateEventChannels(data.oid, data.events)
        // }
    }
    // Persist changes to dump.rdb
    redisDb.save()
}
