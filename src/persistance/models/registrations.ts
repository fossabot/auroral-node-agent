// Global packages
import { IItemPrivacy } from '../../types/misc-types'
import { logger } from '../../utils/logger'
import { redisDb } from '../redis'
import { Thing } from '../../types/wot-types'

/**
 * registrations.js
 * registrations model
 * [registrations] list in REDIS contains registered OIDs
 * Each OID is a hash in REDIS with the following fields:
 * oid, type, credentials, password, adapterId, name, properties, events, agents
*/

// Human readable privacy
const PRIV_ARRAY = ['Private', 'For Friends', 'Public']

// Body when received or returned by application
export type RegistrationJSON = RegistrationJSONBasic | Thing

export enum ItemDomainType {
    ENERGY = 'Energy',
    UNDEFINED = 'Undefined',
    MOBILITY = 'Mobility',
    HEALTH = 'Health',
    FARMING = 'Farming',
    TOURISM = 'Tourism',
    WEATHER = 'Weather',
    INDOORQUALITY = 'Indoor quality'
}

export type ItemLabelsObj = {
    domain: ItemDomainType,
}

export interface RegistrationJSONBasic {
    type: string
    adapterId: string
    name: string
    properties?: string[]
    labels?: ItemLabelsObj
    avatar?: string
    groups?: string[]
    events?: string[]
    actions?: string[]
    version?: string
    description?: string
    privacy?: string,
    oid?: string
}


export interface RegistrationnUpdateRedis {
    oid: string
    adapterId?: string
    name?: string
    description?: string
    properties?: string
    events?: string // Stringify to register in REDIS
    actions?: string // Stringify to register in REDIS
}

export interface RegistrationnUpdateNm {
    oid: string
    adapterId: string
    name: string
    labels?: ItemLabelsObj
    avatar?: string
    groups?: string[]
    version?: string
    description?: string
}

export interface RegistrationUpdate {
    oid: string
    adapterId: string
    name: string
    properties?: string[]
    labels?: ItemLabelsObj
    avatar?: string
    groups?: string[]
    events?: string[]
    actions?: string[]
    version?: string
    description?: string
}

// Body ready to register
export interface RegistrationBody {
    type: string
    adapterId: string
    name: string
    properties?: string
    labels?: ItemLabelsObj
    avatar?: string
    groups?: string[]
    events?: string // Stringify to register in REDIS
    actions?: string // Stringify to register in REDIS
    version?: string // Stringify to register in REDIS
    description?: string
    oid: string
}


export enum ItemPrivacy {
    PUBLIC = 2,
    FOR_FRIENDS = 1,
    PRIVATE = 0
}

// Complete registration type after item is registered in AURORAL
// Item stored in REDIS
export interface Registration extends RegistrationBody {
    privacy?: ItemPrivacy
    credentials: string
    password: string
    created: string
}

export const registrationFuncs = {
    // Store array of whole model in db
    storeInMemory: async (array: Registration[]): Promise<void> => {
        await storeItems(array)
    },
    // Get array of whole model from db
    loadFromMemory: async (): Promise<Registration[]> => {
        const oids = await redisDb.smembers('registrations')
        return Promise.all(oids.map(async (it) => {
            return redisDb.hgetall(it) as unknown as Registration
        }))
    },
    // Add item to db
    addItem: async (data: Registration): Promise<void> => {
        await storeItems([data])
    },
    // update sotred item
    updateItem: async (item: RegistrationnUpdateRedis): Promise<void> => {
        if (!item.oid) {
            throw new Error(`Object with misses some oid, its update could not be stored...`)
        }
        const exists = await redisDb.sismember('registrations', item.oid)
        if (exists) {
            if (item.name) {
                await redisDb.hset(item.oid, 'name', item.name)
            }
            if (item.adapterId) {
                await redisDb.hset(item.oid, 'adapterId', item.adapterId)
            }
            if (item.properties != undefined) {
                redisDb.hset(item.oid, 'properties', item.properties)
            }
            if (item.events!= undefined) {
                redisDb.hset(item.oid, 'events', item.events)
            }
            if (item.actions!= undefined) {
                redisDb.hset(item.oid, 'actions', item.actions)
            }
        } else {
            throw new Error("Object does not exists - not updated")
        }
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
            todo.push(redisDb.hdel(oid, 'created'))
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
    getItem: async (id?: string): Promise<RegistrationJSONBasic | string[]> => {
        if (id) {
            const data = await redisDb.hgetall(id)
            // Return to user
            // Do not return credentials or password!!
            return {
                type: data.type,
                adapterId: data.adapterId,
                name: data.name,
                version: data.version,
                description: data.description,
                privacy: PRIV_ARRAY[Number(data.privacy)],
                properties: data.properties ? data.properties.split(',') : undefined,
                actions: data.actions ? data.actions.split(',') : undefined,
                events: data.events ? data.events.split(',') : undefined,
            }
        } else {
            return redisDb.smembers('registrations')
        }
    },
    // Set item privacy in registration set
    setPrivacy: async (items: IItemPrivacy[]): Promise<void> => {
        await Promise.all(items.map(async it => {
                await redisDb.hset(it.oid, 'privacy', String(it.privacy))
            })
        )
        await redisDb.hset('configuration', 'last_privacy_update', new Date().toISOString())
    },
    // Get item from db;
    // Returns privacy if ID provided;
    // Returns array all oids with privacy if ID not provided;
    getPrivacy: async (id?: string): Promise<ItemPrivacy | IItemPrivacy[]> => {
        // TBD display time last updated and maybe restrict access if older than 1 day
        if (id) {
            return redisDb.hget(id, 'privacy') as unknown as Promise<ItemPrivacy>
        } else {
            const items = await redisDb.smembers('registrations')
            return Promise.all(
                items.map(async (it): Promise<IItemPrivacy> => {
                    return {
                        oid: it,
                        privacy: await redisDb.hget(it, 'privacy') as unknown as ItemPrivacy
                    }
                })
            )
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
            todo.push(redisDb.hset(data.oid, 'created', data.created))
            todo.push(redisDb.hset(data.oid, 'type', data.type))
            if (data.properties) {
                todo.push(redisDb.hset(data.oid, 'properties', data.properties))
            }
            if (data.events) {
                todo.push(redisDb.hset(data.oid, 'events', data.events))
            }
            if (data.actions) {
                todo.push(redisDb.hset(data.oid, 'actions', data.actions))
            }
            await Promise.all(todo)
        } else {
            logger.warn(`OID: ${data.oid} is already stored in memory.`)
        }
    }
    // Persist changes to dump.rdb
    redisDb.save()
}
