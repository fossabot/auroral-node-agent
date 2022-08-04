/* eslint-disable import/first */
import * as persistance from '../../src/persistance/persistance'

// Mocks
// redis is mocked manually in ./__mocks__/
// got is mocked manually in ./__mocks__/
jest.mock('got')
jest.mock('../../src/utils/logger')
jest.mock('redis')
// needs to be imported after jest.mock()
import redis from '../../__mocks__/redis'

beforeEach(() => {
    // Set up some mocked out file info before each test
    redis.__notFail()
  })

afterEach(() => {    
    jest.clearAllMocks()
})

describe('Persistance Methods', () => {
    it('Get all items registered', async () => {
        const spy = jest.spyOn(persistance, 'getItem')
        const response = await persistance.getItem('registrations')
        expect(response).toEqual(['a', 'b'])
        redis.__toFail()
        try {
            await persistance.getItem('registrations')
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('addItem', async () => {
        const spy = jest.spyOn(persistance, 'addItem')
        const item = { credentials: 'string',
            password: 'string',
            created: 'string',
            adapterId: 'string',
            name: 'string',
            type: 'Device' 
        }
        persistance.addItem('registrations', item)
        await persistance.addItem('properties', item)
        try {
            await persistance.addItem('registrations', JSON.parse('{}'))
        } catch (error) {
            expect((error as Error).message).toMatch('Wrong type')
        }
        redis.__toFail()
        try {
            await persistance.addItem('registrations', item)
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(4)
    })
    it('updateItem', async () => {
        const spy = jest.spyOn(persistance, 'updateItem')
        const response = await persistance.updateItem({ oid: 'string' })
        redis.__toFail()
        try {
            await persistance.updateItem({ oid: 'string' })
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('removeItem', async () => {
        const spy = jest.spyOn(persistance, 'removeItem')
        await persistance.removeItem('registrations', ['string'])
        await persistance.removeItem('properties', ['string'])
        redis.__toFail()
        try {
            await persistance.removeItem('registrations', ['string'])
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(3)
    })
    it('getItem', async () => {
        const spy = jest.spyOn(persistance, 'getItem')
        const response = await persistance.getItem('registrations', 'string')

        expect(spy).toHaveBeenCalled()
        expect(response).toEqual({ 'actions': undefined, 
                                'adapterId': undefined,
                                'description': undefined,
                                'events': undefined, 
                                'name': undefined,
                                'privacy': undefined,
                                'status': 'Disabled',
                                'properties': undefined,
                                'type': undefined,
                                'version': undefined })
        try {
            await persistance.getItem('properties', 'string')
        } catch (error) {
            expect((error as Error).message).toMatch('Unexpected token s in JSON')
        }                        
        redis.__toFail()                       
        try {
            await persistance.getItem('registrations', 'string')
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(3)
    })
    it('getCountOfItems', async () => {
        const spy = jest.spyOn(persistance, 'getCountOfItems')
        const response = await persistance.getCountOfItems('registrations')
        expect(response).toEqual(2)
        const response2 = await persistance.getCountOfItems('properties')
        expect(response2).toEqual(2)
        redis.__toFail()
        try {
            await persistance.getCountOfItems('registrations')
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(3)
    })
    it('existsAdapterId', async () => {
        const spy = jest.spyOn(persistance, 'existsAdapterId')
        const response = await persistance.existsAdapterId('string')
        expect(response).toEqual(true)
        redis.__toFail()
        try {
            await persistance.existsAdapterId('string')
        } catch (error) {
            expect((error)).toBe(true)
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('sameAdapterId', async () => {
        const spy = jest.spyOn(persistance, 'sameAdapterId')
        const response = await persistance.sameAdapterId('string', 'string')
        expect(response).toEqual(true)
        redis.__toFail()
        try {
            await persistance.sameAdapterId('string', 'string')
        } catch (error) {
            expect((error as Error).message).toMatch('REGISTRATION ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('getOidByAdapterId', async () => {
        const spy = jest.spyOn(persistance, 'getOidByAdapterId')
        const response = await persistance.getOidByAdapterId('string')
        expect(response).toBe('string')
        redis.__toFail()
        try {
            await persistance.getOidByAdapterId('string')
        } catch (error) {
            expect((error)).toBe(true)
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('getCredentials', async () => {
        const spy = jest.spyOn(persistance, 'getCredentials')
        const response = await persistance.getCredentials('string')
        expect(response).toEqual('string')
        redis.__toFail()
        try {
            await persistance.getCredentials('string')
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('combinationExists', async () => {
        const spy = jest.spyOn(persistance, 'combinationExists')
        const response = await persistance.combinationExists('string', 'string')
        expect(response).toEqual(true)
        redis.__toFail()
        try {
            await persistance.combinationExists('string', 'string')
        } catch (error) {
            expect((error as Error).message).toMatch('error')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('isRegistered', async () => {
        const spy = jest.spyOn(persistance, 'isRegistered')
        const response = await persistance.isRegistered('string')
        expect(spy).toHaveBeenCalled()
        expect(response).toEqual(true)
        redis.__toFail()
        try {
            await persistance.isRegistered('string')
        } catch (error) {
            expect(error).toBe(true)
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('reloadConfigInfo', async () => {
        const spy = jest.spyOn(persistance, 'reloadConfigInfo')
        await persistance.reloadConfigInfo('string', 'string',['string'], ['string'])
        expect(spy).toHaveBeenCalled()
        redis.__toFail()
        try {
            await persistance.reloadConfigInfo('string', 'string',['string'], ['string'])
        } catch (error) {
            expect(error)
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('getConfigInfo', async () => {
        const spy = jest.spyOn(persistance, 'getConfigInfo')
        const response = await persistance.getConfigInfo()
        expect(spy).toHaveBeenCalled()
        expect(response).toEqual({ 'test': true })
        redis.__toFail()
        try {
            await persistance.getConfigInfo()
        } catch (error) {
            expect(error).toBe(true)
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('addToCache', async () => {
        const spy = jest.spyOn(persistance, 'addToCache')
        const response = await persistance.addToCache('string', 'string')
        expect(spy).toHaveBeenCalled()
        expect(response).toEqual(true)
        redis.__toFail()
        try {
            await persistance.addToCache('string', 'string')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCK')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('redisHealth', async () => {
        const spy = jest.spyOn(persistance, 'redisHealth')
        const response = await persistance.redisHealth()
        expect(response).toEqual('OK')
        redis.__toFail()
        try {
            await persistance.redisHealth()
        } catch (error) {
            expect(error).toBe(true)
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
})
