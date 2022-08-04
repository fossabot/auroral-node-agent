
jest.mock('redis')
jest.mock('../../src/config')
jest.mock('../../src/utils/logger')
jest.mock('cron')

/* eslint-disable import/order */
/* eslint-disable import/first */
// import { CronJob } from 'cron'
import * as con from '../../src/config'
import { security }  from '../../src/core/security'
import { registrationFuncs } from '../../src/persistance/models/registrations'
import * as  gateway  from '../../src/microservices/gateway'
import { redisDb } from '../../src/persistance/redis'

const myGateway = gateway.gateway as jest.Mocked<typeof gateway.gateway>
const myConfig = con.Config as jest.Mocked<typeof con.Config>

afterEach(() => {    
    jest.clearAllMocks()
})

describe('Secirity core', () => {
    it('Do getItemsPrivacy', async () => {
        const spy = jest.spyOn(security, 'getItemsPrivacy')
        jest.spyOn(registrationFuncs, 'getPrivacy').mockResolvedValue([{ oid: 'oid', privacy: 2 }])
        const response1 = await security.getItemsPrivacy()
        expect(response1).toMatchObject([{ oid: 'oid', privacy: 2 }])
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do cacheItemsPrivacy', async () => {
        const spy = jest.spyOn(security, 'cacheItemsPrivacy')
        jest.spyOn(registrationFuncs, 'setPrivacyAndStatus').mockResolvedValue()
        await security.cacheItemsPrivacy()
        // expect(response1).toMatchObject([{ oid: 'oid', privacy: 2 }])
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do contractExists', async () => {
        const spy = jest.spyOn(security, 'contractExists')
        // jest.spyOn(registrationFuncs, 'getPrivacy').mockResolvedValue([{ oid: 'oid', privacy: 2 }])
        jest.spyOn(redisDb, 'get').mockResolvedValueOnce('test')
        const response1 = await security.contractExists('id')
        expect(response1).toBe(true)
        jest.spyOn(redisDb, 'get').mockResolvedValueOnce('NOT_EXISTS')
        const response2 = await security.contractExists('id')
        expect(response2).toBe(false)
        jest.spyOn(redisDb, 'get').mockResolvedValueOnce(null)
        jest.spyOn(myGateway, 'getContracts').mockResolvedValue({ error: null, message: { ctid: 'ctid', cid: 'cid', items: [{ oid: 'oid1', rw: true }] } })
        jest.spyOn(redisDb, 'hgetall').mockResolvedValue({ test1: 'a' })
        jest.spyOn(redisDb, 'hdel').mockResolvedValue(1)
        jest.spyOn(redisDb, 'remove').mockResolvedValue()
        jest.spyOn(redisDb, 'set').mockResolvedValue()
        const response3 = await security.contractExists('id')
        expect(response3).toBe(true)

        jest.spyOn(redisDb, 'get').mockResolvedValueOnce(null)
        jest.spyOn(myGateway, 'getContracts').mockResolvedValue(JSON.parse('{ "cid": "cid", "items": [{ "oid": "oid1", "rw": true }] }'))
        jest.spyOn(redisDb, 'hgetall').mockResolvedValue({ test1: 'a' })
        jest.spyOn(redisDb, 'hdel').mockResolvedValue(1)
        jest.spyOn(redisDb, 'remove').mockResolvedValue()
        jest.spyOn(redisDb, 'set').mockResolvedValue()
        const response4 = await security.contractExists('id')
        expect(response4).toBe(false)
        expect(spy).toHaveBeenCalledTimes(4)
    })
    it('Do canWriteItem', async () => {
        const spy = jest.spyOn(security, 'canWriteItem')
        jest.spyOn(redisDb, 'hget').mockResolvedValue('true')
        const response1 = await security.canWriteItem('ctid', 'oid')
        expect(response1).toBe(true)
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do delContract', async () => {
        const spy = jest.spyOn(security, 'delContract')
        jest.spyOn(redisDb, 'hgetall').mockResolvedValue({ test1: 'a' })
        jest.spyOn(redisDb, 'hdel').mockResolvedValue(1)
        jest.spyOn(redisDb, 'remove').mockResolvedValue()
        const response1 = await security.delContract({ ctid: 'ctid', cid: 'cid' })
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do getContract', async () => {
        const spy = jest.spyOn(security, 'getContract')
        jest.spyOn(redisDb, 'get').mockResolvedValue('NOT_EXISTS')
        const response1 = await security.getContract('cid')
        expect(response1).toMatchObject({ ctid: 'NOT_EXISTS', cid: 'cid', items: [] })
        jest.spyOn(redisDb, 'get').mockResolvedValue('ctid')
        jest.spyOn(redisDb, 'hgetall').mockResolvedValue({ 'oid1': 'true' })

        const response2 = await security.getContract('cid')
        expect(response2).toMatchObject({ 'cid': 'cid', 'ctid': 'ctid', 'items': [{ 'oid': 'oid1', 'rw': true }] })
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do updItemInContract', async () => {
        const spy = jest.spyOn(security, 'updItemInContract')
        jest.spyOn(redisDb, 'get').mockResolvedValue('NOT_EXISTS')
        jest.spyOn(redisDb, 'hdel').mockResolvedValue(1)
        jest.spyOn(redisDb, 'hset').mockResolvedValue(1)
        jest.spyOn(myGateway, 'getContracts').mockResolvedValue({ error: null, message: { ctid: 'ctid', cid: 'cid', items: [{ oid: 'oid1', rw: true }] } })
        const response1 = await security.updItemInContract({ cid: 'cid', ctid: 'ctid', oid: 'oid' })
        expect(response1).toBeUndefined()
        jest.spyOn(redisDb, 'get').mockResolvedValue('ctid')
        jest.spyOn(myGateway, 'getContracts').mockResolvedValue(JSON.parse('{"cid": "cid", "items": [{ "oid": "oid1", "rw": true }] }'))
        const response2 = await security.updItemInContract({ cid: 'cid', ctid: 'ctid', oid: 'oid' })
        // const response2 = await security.updItemInContract('cid')
        expect(response2).toBeUndefined()
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do delItemInContract', async () => {
        const spy = jest.spyOn(security, 'delItemInContract')
        jest.spyOn(redisDb, 'hdel').mockResolvedValue(1)
        const response1 = await security.delItemInContract({ cid: 'cid', ctid: 'ctid', oid: 'oid' })
        expect(response1).toBeUndefined()
        jest.spyOn(redisDb, 'hdel').mockResolvedValue(0)
        const response2 = await security.delItemInContract({ cid: 'cid', ctid: 'ctid', oid: 'oid' })
        // const response2 = await security.delItemInContract('cid')
        expect(response2).toBeUndefined()
        expect(spy).toHaveBeenCalledTimes(2)
    })
})
//
