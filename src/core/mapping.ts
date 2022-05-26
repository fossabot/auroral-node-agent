/* eslint-disable no-multi-str */
import Mustache from 'mustache'
import { logger, errorHandler, HttpStatusCode, MyError } from '../utils'
import { wot } from '../microservices/wot'
import { InteractionMapping, JsonType } from '../types/misc-types'
import { Thing } from '../types/wot-types'
import { redisDb } from '../persistance/redis'
import { getItem } from '../persistance/persistance'
import { RegistrationNonSemantic } from '../persistance/models/registrations'

const thingMappingBase = 
'{"@context": { \
    "@vocab" : "https://saref.etsi.org/core/", \
    "core" : "https://auroral.iot.linkeddata.es/def/core#", \
    "oid" : "@id", \
    "aboutProperty" : { \
    "@id" : "https://saref.etsi.org/core/aboutProperty", \
    "@type" : "@id" \
    } \
    },\
"@type": "{{{@type}}}",\
"oid": "{{{id}}}",\
"iid": "{{{iid}}}",\
"makesMeasurement": {{{measurements}}} }' 

const propertyMappingBase = 
'{"aboutProperty": "{{{type}}}",\
"hasValue": {{{value}}},\
"hasTimestamp": "{{{timestamp}}}"}' 

export const storeMapping = async (oid: string) => {
    try {
        const td = (await wot.retrieveTD(oid)).message
        if (!td) {
            throw new MyError('TD not found, not possible to create mapping')
        }
        const mappings = generateMapping(td)
        await Promise.all(mappings.map(async map => {
            logger.info('Storing mapping to redis: ' + map.oid + ' - ' + map.iid)
            await redisDb.hset(map.oid, 'mapping:' + map.iid, map.mapping)
        }))
    } catch (err) {
        const error = errorHandler(err)
        logger.warn('Mapping error: ' + error.message)
    }
}

export const useMapping = async (oid: string, iid: string, value: any, timestamp?: string) : Promise<JsonType> => {
    // retrieve mapping 
    try {
        logger.debug('Getting mapping for: ' + oid + ' ' + iid)
        const mapping = await redisDb.hget(oid, 'mapping:' + iid) 
        if (!mapping) {
            logger.warn('Mapping not found')
            const defaultObj =  {
                type: 'unknown',
                value: value,
                // Use timestamp if provided - else us now
                timestamp: timestamp ? timestamp : new Date().toISOString()
            }
            return JSON.parse(Mustache.render(thingMappingBase, { id: oid, '@type': 'unknown', iid, measurements: '[' + Mustache.render(propertyMappingBase, defaultObj) + ']' }))
        }
        // enrich using mustache
        // const mappingValuesNum = (mapping.match(/{{{value/g) || []).length
        // if (mappingValuesNum > 1) {
        //     if (!Array.isArray(value) || mappingValuesNum !== value.length) {
        //         throw new Error('Number of provided values is different than in TD')
        //     }
        //     // multiple values expected
        //     const measurementsMapping : any = {} 
        //     let valIndex = 0
        //     // try to parse values
        //     value.forEach((val: any) => {
        //         measurementsMapping['value' + valIndex++] = 
        //             typeof value === 'object' ?  JSON.stringify(val) : '"' + val + '"'
        //     })
        //     return JSON.parse(Mustache.render(mapping, { ...measurementsMapping, timestamp: new Date().toISOString() }))
        // } else {
        // expected only one value
        const parsedVal = JSON.stringify(value)
        return JSON.parse(Mustache.render(mapping, { value: parsedVal, timestamp: timestamp ? timestamp : new Date().toISOString() }))
        // }
    } catch (err) {
        const error = errorHandler(err)
        throw new MyError('Mapping and value incompatibility: ' + error.message, HttpStatusCode.BAD_REQUEST)
    }
}

export const useMappingArray = async (oid: string, iid: string, values: JsonType) : Promise<JsonType> => {
    try {
        const mappingsArray : JsonType[] = [] 
        for (const value of Array.isArray(values) ? values : [values]) {
            const keys = Object.keys(value)
            const timestamp = value.timestamp ? value.timestamp : new Date().toISOString()
            // CHECK: timestamp is required 
            if (!value.timestamp && iid === 'getHistorical') {
                throw new MyError('Please provide timestamps for each measurement')
            }
            for (const key of keys) {
               const obj = value[key]
               if (key !== 'timestamp') {
                    mappingsArray.push(await useMapping(oid, key, obj, timestamp))
                }
            }
        }
        let finalMapping = {} as JsonType
        if (mappingsArray.length !== 0) { 
            finalMapping = mappingsArray[0]
            finalMapping.makesMeasurement = mappingsArray.map((m =>  m.makesMeasurement[0]))
            finalMapping.iid = iid
        }
        return finalMapping
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
                await redisDb.hdel(oid, 'mapping:' + prop)
            })
        )
   }
}

/**
 * Generates mappings for the adapters using Node-Red
 * BVR mappings only accept monitors one property
 * Nested complex properties not accepted either
 * IMPORTANT: @TBD For now not using units until is clarified with UPM 
 * @param td 
 * @returns 
 */
const generateMapping = (td: Thing): InteractionMapping[] => {
    // properties
    const propMappings = !td.properties ? [] : Object.entries(td.properties).map(prop => {
        let measurements
        if (!prop[1].monitors) {
            prop[1].monitors = undefined
            measurements =  '[' + Mustache.render(propertyMappingBase, { type: 'unknown', value: '{{{value}}}' , timestamp: '{{{timestamp}}}' }) + ']'
        } else {
            // If array extract value (Take only first if more than one, not supported multiple property types)
            prop[1].monitors = Array.isArray(prop[1].monitors) ? prop[1].monitors[0] : prop[1].monitors
            const templateObject = {
                ...prop,
                type: prop[1].monitors,
                value: '{{{value}}}',
                timestamp: '{{{timestamp}}}' 
            }
            measurements =  '[' + Mustache.render(propertyMappingBase, templateObject) + ']'
        }
        return { oid: td.id, iid: prop[0], mapping: Mustache.render(thingMappingBase, { ...td,  measurements, iid: prop[0] }) } as InteractionMapping
    })
    // events
    const eventMappings = !td.events ?  [] : Object.entries(td.events).map(event => {
        let measurements
        if (!event[1].monitors) {
            event[1].monitors = undefined
            measurements =  '[' + Mustache.render(propertyMappingBase, { type: 'unknown', value: '{{{value}}}' , timestamp: '{{{timestamp}}}' }) + ']'
        } else {
            // If array extract value (Take only first if more than one, not supported multiple property types)
            event[1].monitors = Array.isArray(event[1].monitors) ? event[1].monitors[0] : event[1].monitors
            const templateObject = {
                ...event,
                type: event[1].monitors,
                value: '{{{value}}}',
                timestamp: '{{{timestamp}}}' 
            }
            measurements = '[' + Mustache.render(propertyMappingBase, templateObject) + ']'
        }
        return { oid: td.id, iid: event[0], mapping: Mustache.render(thingMappingBase, { ...td,  measurements, iid: event[0] }) } as InteractionMapping
    })
    // actions
    // @TBD
    // const actionMappings = []
    return [...propMappings, ...eventMappings]
}
