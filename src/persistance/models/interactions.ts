// Global packages
import { JsonType } from '../../types/misc-types'
import { logger, errorHandler } from '../../utils'
import { redisDb } from '../redis'

/**
 * interactions.js
 * interactions models - properties, events, actions
 * [properties] list in REDIS contains registered PIDs
 * Each properties:pid is a hash in REDIS
 * Hash contains --> body { object with interaction description in JSON}, vicinity { vicinity interaction type } 
*/

export interface Interaction extends JsonType {
    type: string
}

const INTERACTIONS = {
    properties: { 'id': 'pid', 'does': 'monitors' },
    actions: { 'id': 'aid', 'does': 'affects' },
    events: { 'id': 'eid', 'does': 'monitors' }
}

export enum InteractionsEnum {
    PROPERTIES = 'properties',
    ACTIONS = 'actions',
    EVENTS = 'events'
}

export type InteractionsType = 'properties' | 'actions' | 'events'

export const interactionFuncs = {
    // Store array of whole model in db
    storeInMemory: async (array: Interaction[], type: InteractionsType): Promise<void> => {
        await storeItems(array, type)
    },
    // Get array of whole model from db
    loadFromMemory: async (type: InteractionsType): Promise<Interaction[]> => {
        const all_interactions = await redisDb.smembers(type)
        const results: Interaction[] = []
        all_interactions.forEach(async (it) => {
            results.push(JSON.parse(await redisDb.hget(`${type}:${it}`, 'body')))
        })
        return results
    },
    // Add item to db
    addItem: async (data: Interaction, type: InteractionsType): Promise<void> => {
        await storeItems([data], type)
    },
    // Remove item from db
    removeItem: async (ids: string | string[], type: InteractionsType): Promise<void> => {
        if (typeof ids === 'string') {
            ids = [ids]
        }
        for (let i = 0, l = ids.length; i < l; i++) {
            const id = ids[i]
            const todo = []
            todo.push(redisDb.srem(type, id))
            todo.push(redisDb.hdel(`${type}:${id}`, 'body'))
            todo.push(redisDb.hdel(`${type}:${id}`, 'vicinity'))
            await Promise.all(todo)
        }
        // Persist changes to dump.rdb
        redisDb.save()
    },
    // Get item from db;
    // Returns object if ID provided;
    // Returns array of ids if ID not provided;
    getItem: async (type: InteractionsType, id?: string): Promise<Interaction | string[]> => {
        let obj
        if (id) {
            obj = await redisDb.hget(type + ':' + id, 'body')
            return JSON.parse(obj)
        } else {
            return redisDb.smembers(type)
        }
    },

    // Get count of items in model stored in db
    getCountOfItems: async (type: InteractionsType): Promise<number> => {
        return redisDb.scard(type)
    }
}

// Private functions

const storeItems = async (array: Interaction[], type: InteractionsType): Promise<boolean> => {
    const interaction =  INTERACTIONS[type]
    const id = interaction.id
    const does = interaction.does
    let success = true // Case some interaction is not valid, no error but no success either
    logger.debug(`Storing ${type}...`)
    const l = array.length
    logger.debug(`Trying to store ${l} ${type}`)
    for (let i = 0; i < l; i++) {
        try {
            const aux = array[i][id] == null ? 'test' : array[i][id] // Avoid type error in redis
            const exists = await redisDb.sismember(type, aux)
            const notNull = (array[i][id] != null && array[i][does] != null)
            if (!exists && notNull) {
                await redisDb.sadd(type, array[i][id])
                await redisDb.hset(`${type}:${array[i][id]}`, 'body', JSON.stringify(array[i]))
                await redisDb.hset(`${type}:${array[i][id]}`, 'vicinity', array[i][does])
                logger.debug(`${type} entry ${i} : ${array[i][id]} stored`, 'PERSISTANCE')
            } else {
                if (exists) {
                    logger.warn(`${type} entry ${i} already exists`, 'PERSISTANCE')
                }
                if (!notNull) {
                    logger.warn(`${type} entry ${i} misses id or interaction`, 'PERSISTANCE')
                }
                success = false
            }
        } catch (err) {
            const error = errorHandler(err)
            logger.warn(error.message)
            throw new Error(error.message)
        }
    }
    // Persist changes to dump.rdb
    redisDb.save()
    return success
}
