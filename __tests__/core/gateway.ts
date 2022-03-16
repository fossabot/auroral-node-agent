
jest.mock('../../src/microservices/gateway')
jest.mock('../../src/utils/logger')
jest.mock('redis')

/* eslint-disable import/order */
/* eslint-disable import/first */
import { gtwServices } from '../../src/core/gateway'
import * as  gateway  from '../../src/microservices/gateway'
import * as persistance from '../../src/persistance/persistance'
import { GatewayResponse } from '../../src/types/gateway-types'
import redis from '../../__mocks__/redis'

const myGateway = gateway.gateway as jest.Mocked<typeof gateway.gateway>
// const myPersistance = persistance.persistance as jest.Mocked<typeof persistance.persistance>

beforeEach(() => {
    redis.__notFail()
})

afterEach(() => {    
    jest.clearAllMocks()
})

describe('GtwServices core', () => {
    it('Do doLogins', async () => {
        const spy = jest.spyOn(gtwServices, 'doLogins')
        await gtwServices.doLogins(['oid1', 'oid2'])
        myGateway.login.mockResolvedValueOnce({ error: false } as GatewayResponse)
        myGateway.login.mockRejectedValue('ERROR')
        await gtwServices.doLogins(null)
        await gtwServices.doLogins(null)
        expect(spy).toHaveBeenCalledTimes(3)
    })
    it('Do doLogouts', async () => {
        const spy = jest.spyOn(gtwServices, 'doLogouts')
        await gtwServices.doLogouts(['oid1', 'oid2'])
        myGateway.logout.mockResolvedValueOnce({ error: false } as GatewayResponse)
        myGateway.logout.mockRejectedValue('ERROR')
        try {
            await gtwServices.doLogouts(['oid1', 'oid2'])
        } catch (err) {
            expect(err).toContain('ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do registerObject', async () => {
        const spy = jest.spyOn(gtwServices, 'registerObject')
        const item = { type: 'Device', adapterId: '123', oid: 'oid1', name: 'name' }
        const fakeResult = '{ "error": false, "message": [{ "oid": "oid", "password": "pass1", "name": "name" }] }'
        myGateway.postRegistrations.mockResolvedValue(JSON.parse(fakeResult))
        const mockAddItem = jest.fn()
        jest.spyOn(persistance, 'addItem').mockResolvedValue()
        // 1
        const result = await gtwServices.registerObject([item])
        expect((result.errors)).toHaveLength(0)
        const fakeResult2 = '{ "error": true, "message": [{ "oid": "oid", "password": "pass1", "name": "name" }] }'
        myGateway.postRegistrations.mockResolvedValue(JSON.parse(fakeResult2))
        // 2
        try {
            const result2 = await gtwServices.registerObject([item])
        } catch (err) {
            expect(JSON.stringify(err)).toMatch('503')
        }
        myGateway.postRegistrations.mockResolvedValue(JSON.parse(fakeResult))
        jest.spyOn(persistance, 'addItem').mockRejectedValue('ERROR')
        // 3
        const result3 = await gtwServices.registerObject([item])
        
        myGateway.postRegistrations.mockResolvedValue(JSON.parse(fakeResult))
        jest.spyOn(persistance, 'addItem').mockRejectedValue('ERROR')
        // 4
        const fakeResult4 = '{ "error": false, "message": [{ "oid": "oid", "name": "name" }] }'
        myGateway.postRegistrations.mockResolvedValue(JSON.parse(fakeResult4))
        jest.spyOn(persistance, 'addItem').mockResolvedValue()
        const result4 = await gtwServices.registerObject([item])
        expect(spy).toHaveBeenCalledTimes(4)
    })
    it('Do updateObject', async () => {
        const spy = jest.spyOn(gtwServices, 'updateObject')
        const item = { type: 'Device', adapterId: '123', oid: 'oid', name: 'name' }
        const fakeResult = '{ "error": false, "message": [{ "oid": "oid" }] }'
        myGateway.updateRegistration.mockResolvedValue(JSON.parse(fakeResult))
        jest.spyOn(persistance, 'updateItem').mockResolvedValue()
        // 1
        const result = await gtwServices.updateObject([item])
        expect((result.errors)).toHaveLength(0)

        const fakeResult2 = '{ "error": true, "message": [{ "oid": "oid", "error": true }] }'
        myGateway.updateRegistration.mockResolvedValue(JSON.parse(fakeResult2))
        // 2
        try {
            await gtwServices.updateObject([item])
        } catch (err) {
            expect(JSON.stringify(err)).toMatch('platform')
        }
        const fakeResult3 = '{ "error": false, "message": [{ "oid": "oid", "error": false }] }'
        myGateway.updateRegistration.mockResolvedValue(JSON.parse(fakeResult3))
        jest.spyOn(persistance, 'updateItem').mockRejectedValue('REDIS')
        // 3
        const response3 = await gtwServices.updateObject([item])
        expect(response3.errors).not.toBe([])
        expect(spy).toHaveBeenCalledTimes(3)

        const fakeResult4 = '{ "error": false, "message": [{ "oid": "oid", "error": true }] }'
        myGateway.updateRegistration.mockResolvedValue(JSON.parse(fakeResult4))
        // 4
        const response4 = await gtwServices.updateObject([item])
        expect(response4.errors).not.toBe([])
        expect(spy).toHaveBeenCalledTimes(4)
    })
    it('Do compareLocalAndRemote', async () => {
        const spy = jest.spyOn(gtwServices, 'compareLocalAndRemote')
        jest.spyOn(persistance, 'updateItem').mockResolvedValue()
        const result = gtwServices.compareLocalAndRemote(['string1', 'string2'],  ['string1', 'string2'])
        expect((result)).toBe(true)
        // 2
        const result2 = gtwServices.compareLocalAndRemote(['string1', 'string2'],  ['string1', 'string3'])
        expect(spy).toHaveBeenCalledTimes(2)
    })
    // missing some unexported fuctions: _filterRedisProperties, _filterNmProperties, _buildItemsForCloud
    //                                  _revertCloudRegistration, _revert_wot_registration
})
