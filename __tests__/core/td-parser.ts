/* eslint-disable no-multi-str */

jest.mock('redis')
jest.mock('../../src/config')
jest.mock('cron')

/* eslint-disable import/order */
/* eslint-disable import/first */
// import { CronJob } from 'cron'
import * as con from '../../src/config'
import * as td  from '../../src/core/td-parser'
import { UpdateJSON } from '../../src/persistance/models/registrations'
import * as myPersistance from '../../src/persistance/persistance'
import { Thing } from '../../src/types/wot-types'

jest.mock('../../src/utils/logger')

// const myPersistance = myPersistance as jest.Mocked<typeof myPersistance>
const myConfig = con.Config as jest.Mocked<typeof con.Config>

const item1 = {
    type: 'Device',
    name: 'testName',
    adapterId: 'adp1',
    avatar: 'asdasdasd',
    events: ['e1','e2'],
    actions: ['a1','a2'],
    properties: ['p1','p2']
}

const item2 = {
    type: 'Device',
    oid: 'oid1',
    name: 'testName',
    adapterId: 'adp1',
    avatar: 'asdasdasd',
    events: ['e1','e2'],
    actions: ['a1','a2'],
    properties: ['p1','p2']
}

const td1 = '{ "@context": "https://www.w3.org/2019/wot/td/v1", \
    "title": "DASHBOARD", \
    "id": "123",\
    "adapterId": "adp1", \
    "securityDefinitions": { \
        "basic_sc": {"scheme": "basic", "in":"header"} \
    }, \
    "security": ["basic_sc"], \
    "properties": { \
        "status" : { \
            "type": "string", \
            "forms": [{"href": "https://mylamp.example.com/status"}] \
        } \
    } \
} \
'

const td2 = '{ "@context": "https://www.w3.org/2019/wot/td/v1", \
    "title": "DASHBOARD", \
    "securityDefinitions": { \
        "basic_sc": {"scheme": "basic", "in":"header"} \
    }, \
    "security": ["basic_sc"], \
    "properties": { \
        "status" : { \
            "type": "string", \
            "forms": [{"href": "https://mylamp.example.com/status"}] \
        } \
    } \
} \
'
const itemTd = {
    type: 'Device',
    name: 'testName',
    adapterId: 'adp1',
    avatar: 'asdasdasd',
    events: ['e1','e2'],
    actions: ['a1','a2'],
    properties: ['p1','p2'],
    td: JSON.parse(td1)
}

afterEach(() => {    
    jest.clearAllMocks()
})

describe('td-parser core', () => {
    it('Do tdParser', async () => {
        const spy = jest.spyOn(td, 'tdParser')
        // 1
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(true)
        const response1 = await td.tdParser(item1)
        expect(JSON.stringify(response1)).toMatch('REGISTRATION ERROR: Adapter ID')
        // 2
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(false)
        const response2 = await td.tdParser([item1, item1])
        expect(JSON.stringify(response2)).toMatch('REGISTRATION ERROR: Adapter ID')
        // 3
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(false)
        const response3 = await td.tdParser([item1])
        expect(response3.errors).toMatchObject([])
        // 4
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(false)
        const response4 = await td.tdParser([JSON.parse(JSON.stringify({ ...item1, name: undefined }))])
        expect(JSON.stringify(response4.errors)).toMatch('Missing name')
        // 5
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(false)
        const response5 = await td.tdParser([JSON.parse(JSON.stringify({ ...item1, type: undefined }))])
        expect(JSON.stringify(response5.errors)).toMatch('Missing type')
        // 5
        jest.spyOn(myPersistance, 'getCountOfItems').mockResolvedValue(101)
        await expect(td.tdParser([itemTd])).rejects.toThrow('You have reached max number of registrations')
        expect(spy).toHaveBeenCalledTimes(6)
    })
    it('Do tdParserWoT', async () => {
        const spy = jest.spyOn(td, 'tdParserWoT')
        // 1
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(true)
        jest.spyOn(myPersistance, 'getCountOfItems').mockResolvedValue(1)

        const response1 = await td.tdParserWoT(itemTd)
        expect(JSON.stringify(response1)).toMatch('REGISTRATION ERROR: Adapter ID')
        // 2
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(false)
        const response2 = await td.tdParserWoT([itemTd, itemTd])
        expect(JSON.stringify(response2)).toMatch('REGISTRATION ERROR: Adapter ID')
        // 3
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(false)
        const response3 = await td.tdParserWoT([itemTd])
        expect(response3.errors).toMatchObject([])
        // 4
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(false)
        await expect(td.tdParserWoT([{ ...itemTd, td: undefined as any as Thing }])).rejects.toThrow('Please include td')
        expect(spy).toHaveBeenCalledTimes(4)
    })
    it('Do tdParserUpdate', async () => {
        const spy = jest.spyOn(td, 'tdParserUpdate')
        // 1
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(true)
        jest.spyOn(myPersistance, 'getItem').mockResolvedValue(['oid1'])
        jest.spyOn(myPersistance, 'sameAdapterId').mockImplementation(async() => {
            throw new Error('TEST')
        })
        const response1 = await td.tdParserUpdate([item2])
        expect(JSON.stringify(response1)).toMatch('TEST')
        // 2
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(true)
        jest.spyOn(myPersistance, 'getItem').mockResolvedValue(['oid1'])
        jest.spyOn(myPersistance, 'sameAdapterId').mockImplementation(async() => {
            return true
        })
        const response2 = await td.tdParserUpdate([item2])
        expect(response2.errors).toMatchObject([])
        // 3
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(true)
        jest.spyOn(myPersistance, 'getItem').mockResolvedValue(['oid1'])
        jest.spyOn(myPersistance, 'sameAdapterId').mockImplementation(async() => {
            return true
        })
        await expect(td.tdParserUpdate([{ ...item2, oid: undefined } as any as UpdateJSON])).rejects
        .toThrow('Missing OID for some objects')
        // 4
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(true)
        jest.spyOn(myPersistance, 'getItem').mockResolvedValue(['aaa'])
        jest.spyOn(myPersistance, 'sameAdapterId').mockImplementation(async() => {
            return true
        })
        await expect(td.tdParserUpdate([{ ...item2 }])).rejects
        .toThrow('Some objects are not registered [oid1]')
        
        expect(spy).toHaveBeenCalledTimes(4)
    })
    it('Do tdParserUpdateWot', async () => {
        const spy = jest.spyOn(td, 'tdParserUpdateWot')
        // 1
        jest.spyOn(myPersistance, 'existsAdapterId').mockResolvedValue(true)
        jest.spyOn(myPersistance, 'getItem').mockResolvedValue(['oid1'])
        await expect(td.tdParserUpdateWot([{ oid: 'oid', td: undefined as any as Thing }])).rejects
        .toThrow('Please provide td')
        // 2 
        await expect(td.tdParserUpdateWot([{ ...itemTd, td: JSON.parse(td2) as any as Thing }])).rejects
        .toThrow('Some objects do not have OIDs')
        // 3
        await expect(td.tdParserUpdateWot([{ ...itemTd, td: JSON.parse(td1) as any as Thing }])).rejects
        .toThrow('Some objects are not registered [123]')
        // 4
        jest.spyOn(myPersistance, 'getItem').mockResolvedValue(['123'])
        const result4 = await td.tdParserUpdateWot([itemTd])
        expect(JSON.stringify(result4.updates)).toMatch('DASHBOARD')
        // 5
        jest.spyOn(myPersistance, 'sameAdapterId').mockImplementation(async() => {
            throw new Error('TEST')
        })
        const result5 = await td.tdParserUpdateWot([itemTd])
        expect(JSON.stringify(result5)).toMatch('TEST')
        expect(spy).toHaveBeenCalledTimes(5)
    })
})
//
