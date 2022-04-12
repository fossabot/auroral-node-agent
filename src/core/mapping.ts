/* eslint-disable no-multi-str */
import Mustache from 'mustache'
import { logger, errorHandler, HttpStatusCode, MyError } from '../utils'

import { wot } from '../microservices/wot'
import { InteractionMapping, JsonType, ThingMapping } from '../types/misc-types'
import { Thing } from '../types/wot-types'
import { redisDb } from '../persistance/redis'
import { getItem } from '../persistance/persistance'
import { RegistrationNonSemantic } from '../persistance/models/registrations'

const thingMappingBase = 
'{"@context": "Sensor",\
"@type": "{{{@type}}}",\
"oid": "{{{id}}}",\
"iid": "{{{iid}}}",\
"measurements": {{{measurements}}} }' 

const propertyMappingBase = 
'{"@type": "{{{@type}}}",\
"value": {{{value}}},\
"units": "{{{units}}}",\
"timestamp": "{{{timestamp}}}"}' 

export const storeMapping = async (oid: string) => {
    const td = (await wot.retrieveTD(oid)).message
    if (!td) {
        throw new MyError('TD not found')
    }
    const mappings = generateMapping(td)
    await Promise.all(mappings.map(async map => {
        logger.debug('Storing mapping to redis: ' + map.oid + ' ' + map.iid)
        await redisDb.hset(map.oid, map.iid, map.mapping)
    }))
}

export const useMapping = async (oid: string, iid: string, value: any) : Promise<JsonType> => {
    // retrieve mapping 
    try {
        logger.debug('Getting mapping for: ' + oid + ' ' + iid)
        const mapping = await redisDb.hget(oid, iid) 
        if (!mapping) {
            throw new MyError('Mapping not found')
        }
        // enrich using mustache
        const mappingValuesNum = (mapping.match(/{{{value/g) || []).length
        if (mappingValuesNum > 1) {
            logger.debug('multi value')
            if (!Array.isArray(value) || mappingValuesNum !== value.length) {
                throw new Error('Number of provided values is different than in TD')
            }
            // multiple values expected
            const measurementsMapping : any = {} 
            let valIndex = 0
            // try to parse values
            value.forEach((val: any) => {
                measurementsMapping['value' + valIndex++] = 
                    typeof value === 'object' ?  JSON.stringify(value) : '"' + value + '"'
            })
            return JSON.parse(Mustache.render(mapping, { ...measurementsMapping, timestamp: new Date().toISOString() }))
        } else {
            // expected only one value
            logger.debug('one value')
            logger.debug(' object?' + typeof value === 'object')
            const testVal = typeof value === 'object' ?  JSON.stringify(value) : '"' + value + '"'
            return JSON.parse(Mustache.render(mapping, { value0: testVal, timestamp: new Date().toISOString() }))
        }
    } catch (err) {
        const error = errorHandler(err)
        throw new MyError('Mapping and value incompatibility: ' + error.message, HttpStatusCode.BAD_REQUEST)
    }
}

export const removeMapping = async (oid: string) => {
   // remove from Redis
   const item = await getItem('registrations', oid) as RegistrationNonSemantic
   // if properties are defined 
   if (item && item.properties) {
        await Promise.all(
            item.properties.map(async prop => {
                logger.info('Removing mapping for ' + oid + ' ' + prop)
                // remove from redis
                await redisDb.hdel(oid, prop)
            })
        )
   }
}

const generateMapping = (td: Thing): InteractionMapping[] => {
    // properties
    const propMappings = !td.properties ?  [] :  Object.entries(td.properties).map(prop => {
        if (!prop[1].monitors) {
            prop[1].monitors = []
        }
        prop[1].monitors = Array.isArray(prop[1].monitors) ? prop[1].monitors : [prop[1].monitors]
        prop[1].measures = Array.isArray(prop[1].measures) ? prop[1].measures : [prop[1].measures]
       
        let valueIndex = 0
        let measurements = '[' + prop[1].monitors.map(monitor => {
            const templateObject = {
                ...prop,
                '@type': monitor.toString(),
                value: '{{{value' + valueIndex + '}}}',
                units: '',
                timestamp: '{{{timestamp}}}' 
            }
            if (prop[1].measures && prop[1].measures[valueIndex]) {
                templateObject.units = prop[1].measures[valueIndex]
            }
            valueIndex++
            return Mustache.render(propertyMappingBase, templateObject)
        }) + ']'
        // if monitors are empty
        if (valueIndex === 0) {
            measurements =  '[' + Mustache.render(propertyMappingBase, { value: '{{{value0}}}' , timestamp: '{{{timestamp}}}' }) + ']'
        }
        // logger.debug('Measurements: ' + (valueIndex) + ' ' + td.id + ' ' + prop[0])
        return { oid: td.id, iid: prop[0], mapping: Mustache.render(thingMappingBase, { ...td,  measurements: measurements, iid: prop[0] }) } as InteractionMapping
    })
    // events
    const eventMappings = !td.events ?  [] : Object.entries(td.events).map(event => {
        if (!event[1].monitors) {
            event[1].monitors = []
        }
        event[1].monitors = Array.isArray(event[1].monitors) ? event[1].monitors : [event[1].monitors]
        event[1].measures = Array.isArray(event[1].measures) ? event[1].measures : [event[1].measures]
        let valueIndex = 0
        let measurements = '[' + event[1].monitors.map(monitor => {
            const templateObject = {
                ...event,
                '@type': monitor.toString(),
                value: '{{{value' + valueIndex + '}}}',
                units: '',
                timestamp: '{{{timestamp}}}' 
            }
            if (event[1].measures && event[1].measures[valueIndex]) {
                templateObject.units = event[1].measures[valueIndex]
            }
            valueIndex++
            return Mustache.render(propertyMappingBase, templateObject)
        }) + ']'
        // if monitors are empty
        if (valueIndex === 0) {
            measurements =  '[' + Mustache.render(propertyMappingBase, { value: '{{{value0}}}' , timestamp: '{{{timestamp}}}' }) + ']'
        }
        return { oid: td.id, iid: event[0], mapping: Mustache.render(thingMappingBase, { ...td,  measurements: measurements, iid: event[0] }) } as InteractionMapping
    })
    // actions
    const actionMappings = !td.actions ?  [] : Object.entries(td.actions).map(action => {
        if (!action[1].affects) {
            action[1].affects = []
        }
        action[1].affects = Array.isArray(action[1].affects) ? action[1].affects : [action[1].affects]
        action[1].measures = Array.isArray(action[1].measures) ? action[1].measures : [action[1].measures]
        let valueIndex = 0
        let measurements = '[' + action[1].affects.map(affect => {
            const templateObject = {
                ...action,
                '@type': affect.toString(),
                value: '{{{value' + valueIndex + '}}}',
                units: '',
                timestamp: '{{{timestamp}}}' 
            }
            if (action[1].measures && action[1].measures[valueIndex]) {
                templateObject.units = action[1].measures[valueIndex]
            }
            valueIndex++
            return Mustache.render(propertyMappingBase, templateObject)
        }) + ']'
        // if monitors are empty
        if (valueIndex === 0) {
            measurements =  '[' + Mustache.render(propertyMappingBase, { value: '{{{value0}}}' , timestamp: '{{{timestamp}}}' }) + ']'
        }
        return { oid: td.id, iid: action[0], mapping: Mustache.render(thingMappingBase, { ...td,  measurements: measurements, iid: action[0] }) } as InteractionMapping
    })
    
    return [...propMappings, ...eventMappings, ...actionMappings]
}
