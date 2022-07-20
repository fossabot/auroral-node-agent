
jest.mock('../../src/config')
jest.mock('../../src/microservices/proxy')
jest.mock('../../src/utils/logger')
jest.mock('got')

/* eslint-disable import/order */
/* eslint-disable import/first */
import { Data, Interaction, Method } from '../../src/core/data'
import * as con from '../../src/config'
import * as  proxy  from '../../src/microservices/proxy'

import { JsonType, RelationshipType } from '../../src/types/misc-types'

const myConfig = con.Config as jest.Mocked<typeof con.Config>
const myProxy = proxy.proxy as jest.Mocked<typeof proxy.proxy>

beforeEach(() => {
})

afterEach(() => {    
    jest.clearAllMocks()
})

describe('Data core', () => {
    it('Do readProperty dummy mode', async () => {
        myConfig.ADAPTER = { MODE: 'dummy', PORT: '', HOST: '', USE_MAPPING: false }
        const spy = jest.spyOn(Data, 'readProperty')
        const response = await Data.readProperty('oid1','pid1')
        expect(JSON.stringify(response)).toMatch('oid1')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do updateProperty dummy mode', async () => {
        myConfig.ADAPTER = { MODE: 'dummy', PORT: '', HOST: '', USE_MAPPING: false }
        const spy = jest.spyOn(Data, 'updateProperty')
        const response = await Data.updateProperty('oid1','pid1', {})
        expect(JSON.stringify(response)).toMatch('oid1')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do receiveEvent dummy mode', async () => {
        myConfig.ADAPTER = { MODE: 'dummy', PORT: '', HOST: '', USE_MAPPING: false }
        const spy = jest.spyOn(Data, 'receiveEvent')
        const response = await Data.receiveEvent('oid1','eid1', {})
        expect(response.success).toBe(true)
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do tdDiscovery dummy mode', async () => {
        myConfig.ADAPTER = { MODE: 'dummy', PORT: '', HOST: '', USE_MAPPING: false }
        const spy = jest.spyOn(Data, 'tdDiscovery')
        const response = await Data.tdDiscovery('oid1', 'originId1', RelationshipType.ME)
        expect(response.message).toStrictEqual({ test: 'testString' })
        const response2 = await Data.tdDiscovery('oid1', 'originId1', RelationshipType.FRIEND, ['oid1'])
        expect(response.message).toStrictEqual({ test: 'testString' })
        const response3 = await Data.tdDiscovery('oid1', 'originId1', RelationshipType.FRIEND)
        expect(response3.message).toBe(undefined)
        expect(spy).toHaveBeenCalledTimes(3)
    })
    it('Do sparqlDiscovery dummy mode', async () => {
        myConfig.ADAPTER = { MODE: 'dummy', PORT: '', HOST: '', USE_MAPPING: false }
        const spy = jest.spyOn(Data, 'sparqlDiscovery')
        const response = await Data.sparqlDiscovery('oid1', 'originId1', RelationshipType.ME, '')
        expect(response.message).toBe(undefined)
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do readProperty proxy mode', async () => {
        myConfig.ADAPTER = { MODE: 'proxy', PORT: '', HOST: '', USE_MAPPING: false }
        myProxy.sendMessageViaProxy.mockResolvedValue({ 'test': true })
        const spy = jest.spyOn(Data, 'readProperty')
        const response = await Data.readProperty('oid1','pid1')
        expect(response.test).toBe(true)
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do readProperty semantic mode', async () => {
        myConfig.ADAPTER = { MODE: 'semantic', PORT: '', HOST: '', USE_MAPPING: false }
        myProxy.sendMessageViaWot.mockResolvedValue({ 'test': true })
        const spy = jest.spyOn(Data, 'readProperty')
        const response = await Data.readProperty('oid1','pid1')
        expect(response.test).toBe(true)
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do sparqlDiscovery semantic mode', async () => {
        myConfig.ADAPTER = { MODE: 'semantic', PORT: '', HOST: '', USE_MAPPING: false }
        const spy = jest.spyOn(Data, 'sparqlDiscovery')
        const response = await Data.sparqlDiscovery('gtwId', 'originId1', RelationshipType.ME, '')
        const response2 = await Data.sparqlDiscovery('gtwId', 'originId1', RelationshipType.FRIEND, '')
        expect(response.message).toStrictEqual({ test: 'testString' })
        expect(response2.message).toBe(undefined)
        expect(spy).toHaveBeenCalledTimes(2)
    })
})
