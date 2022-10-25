/* eslint-disable import/order */
/* eslint-disable import/first */
import { gateway } from '../../src/microservices/gateway'
import { RegistrationBody } from '../../src/persistance/models/registrations'

// got is mocked manually in ./__mocks__/
jest.mock('got')
jest.mock('../../src/utils/logger')
jest.mock('redis')
// needs to be imported after jest.mock()
import got from '../../__mocks__/got'
import redis from '../../__mocks__/redis'

beforeEach(() => {
    // Set up some mocked out file info before each test
    got.__notFail()
    redis.__notFail()
})

describe('Gateway Microservice', () => {
    it('Do logins', async () => {
        const spy = jest.spyOn(gateway, 'login')
        const response = await gateway.login()
        expect(response).toEqual('Login succesful')
        got.__toFail()
        try {
            await gateway.login()
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        // getCredentials to fail
        try {
            await gateway.login()
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        redis.__toFail()
        try {
            await gateway.login('string')
        } catch (error) {
            expect((error as Error).message).toMatch('Test Error')
        }
        expect(spy).toHaveBeenCalledTimes(4)
    })
    it('Do logout', async () => {
        const spy = jest.spyOn(gateway, 'logout')
        const response = await gateway.logout()
        expect(response).toEqual('Logout succesful')
        got.__toFail()
        try {
            await gateway.logout()
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do getRegistrations', async () => {
        const spy = jest.spyOn(gateway, 'getRegistrations')
        const response = await gateway.getRegistrations()
        expect(response).toMatchObject({ message: ['oid1', 'oid2'] })
        got.__toFail()
        try {
            await gateway.getRegistrations()
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do postRegistrations', async () => {
        const spy = jest.spyOn(gateway, 'postRegistrations')
        const device: RegistrationBody = {
            type: 'Device',
            adapterId: '',
            name: 'Device1',
            oid: 'string'
        }
        const response = await gateway.postRegistrations({ items: [device], agid: 'gtwId' })
        expect(response).toEqual('Registration succesful')
        got.__toFail()
        try {
            await gateway.postRegistrations({ items: [device], agid: 'gtwId' })
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do updateRegistration', async () => {
        const spy = jest.spyOn(gateway, 'updateRegistration')
        const device: RegistrationBody = {
            type: 'Device',
            adapterId: '',
            name: 'Device1',
            oid: 'string'
        }
        const response = await gateway.updateRegistration({ items: [device], agid: 'gtwId' })
        expect(response).toEqual('Registration update succesful')
        got.__toFail()
        try {
            await gateway.updateRegistration({ items: [device], agid: 'gtwId' })
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do removeRegistrations', async () => {
        const spy = jest.spyOn(gateway, 'removeRegistrations')
        const response = await gateway.removeRegistrations({ oids: ['oid1', 'oid2'] })
        expect(response).toEqual('Remove registration succesful')
        got.__toFail()
        try {
            await gateway.removeRegistrations({ oids: ['oid1', 'oid2'] })
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do discovery', async () => {
        const spy = jest.spyOn(gateway, 'discovery')
        const response = await gateway.discovery()
        expect(response).toEqual('Discovery succesful')
        got.__toFail()
        try {
            await gateway.discovery()
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do discoveryRemote', async () => {
        const spy = jest.spyOn(gateway, 'discoveryRemote')
        const response = await gateway.discoveryRemote('oid1', { sparql: 'sparql', oids: 'oid1' })
        expect(response).toEqual('DiscoveryRemote succesful')
        const prop = JSON.parse('{ "sparql": {}, "originId": "originId" }')
        const response2 = await gateway.discoveryRemote('oid1', { ...prop })
        expect(response2).toEqual('DiscoveryRemote succesful')
        got.__toFail()
        try {
            await gateway.discoveryRemote('oid1', { sparql: 'sparql', oids: 'oid1' })
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(3)
    })
    it('Do getCid', async () => {
        const spy = jest.spyOn(gateway, 'getCid')
        const response = await gateway.getCid('oid1')
        expect(response).toEqual({ message: 'GetCid succesful' })
        got.__toFail()
        try {
            await gateway.getCid('oid1')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do getPartners', async () => {
        const spy = jest.spyOn(gateway, 'getPartners')
        const response = await gateway.getPartners()
        expect(response).toEqual({ message: 'GetPartners succesful' })
        got.__toFail()
        try {
            await gateway.getPartners()
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do getPartnerInfo', async () => {
        const spy = jest.spyOn(gateway, 'getPartnerInfo')
        const response = await gateway.getPartnerInfo('cid')
        expect(response).toEqual({ message: 'GetPartnerInfo succesful' })
        got.__toFail()
        try {
            await gateway.getPartnerInfo('cid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do getProperty', async () => {
        const spy = jest.spyOn(gateway, 'getProperty')
        const response = await gateway.getProperty('oid', 'roid', 'pid', {})
        expect(response).toEqual('GetProperty succesful')
        got.__toFail()
        try {
            await gateway.getProperty('oid', 'roid', 'pid', {})
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do putProperty', async () => {
        const spy = jest.spyOn(gateway, 'putProperty')
        const response = await gateway.putProperty('oid', 'roid', 'pid', {}, {})
        expect(response).toEqual('PutProperty succesful')
        got.__toFail()
        try {
            await gateway.putProperty('oid', 'roid', 'pid', {}, {})
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do activateEventChannel', async () => {
        const spy = jest.spyOn(gateway, 'activateEventChannel')
        const response = await gateway.activateEventChannel('oid', 'eid')
        expect(response).toEqual('ActivateEventChannel succesful')
        got.__toFail()
        try {
            await gateway.activateEventChannel('oid', 'eid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do publishEvent', async () => {
        const spy = jest.spyOn(gateway, 'publishEvent')
        const response = await gateway.publishEvent('oid', 'eid', {})
        expect(response).toEqual('PublishEvent succesful')
        got.__toFail()
        try {
            await gateway.publishEvent('oid', 'eid', {})
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do deactivateEventChannel', async () => {
        const spy = jest.spyOn(gateway, 'deactivateEventChannel')
        const response = await gateway.deactivateEventChannel('oid', 'eid')
        expect(response).toEqual('DeactivateEventChannel succesful')
        got.__toFail()
        try {
            await gateway.deactivateEventChannel('oid', 'eid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do statusRemoteEventChannel', async () => {
        const spy = jest.spyOn(gateway, 'statusRemoteEventChannel')
        const response = await gateway.statusRemoteEventChannel('oid', 'roid', 'eid')
        expect(response).toEqual('StatusRemoteEventChannel succesful')
        got.__toFail()
        try {
            await gateway.statusRemoteEventChannel('oid', 'roid', 'eid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do subscribeRemoteEventChannel', async () => {
        const spy = jest.spyOn(gateway, 'subscribeRemoteEventChannel')
        const response = await gateway.subscribeRemoteEventChannel('oid', 'roid', 'eid')
        expect(response).toEqual('SubscribeRemoteEventChannel succesful')
        got.__toFail()
        try {
            await gateway.subscribeRemoteEventChannel('oid', 'roid', 'eid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do unsubscribeRemoteEventChannel', async () => {
        const spy = jest.spyOn(gateway, 'unsubscribeRemoteEventChannel')
        const response = await gateway.unsubscribeRemoteEventChannel('oid', 'roid', 'eid')
        expect(response).toEqual('UnsubscribeRemoteEventChannel succesful')
        got.__toFail()
        try {
            await gateway.unsubscribeRemoteEventChannel('oid', 'roid', 'eid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do health', async () => {
        const spy = jest.spyOn(gateway, 'health')
        const response = await gateway.health('oid')
        expect(response).toEqual('Login succesful')
        got.__toFail()
        try {
            await gateway.health('oid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do getItemsPrivacy', async () => {
        const spy = jest.spyOn(gateway, 'getItemsPrivacy')
        const response = await gateway.getItemsPrivacy()
        expect(response).toEqual('GetItemsPrivacy succesful')
        got.__toFail()
        try {
            await gateway.getItemsPrivacy()
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it('Do getContracts', async () => {
        const spy = jest.spyOn(gateway, 'getContracts')
        const response = await gateway.getContracts('cid')
        expect(response).toMatchObject({ message: 'GetContracts succesful' })
        got.__toFail()
        try {
            await gateway.getContracts('cid')
        } catch (error) {
            expect((error as Error).message).toMatch('MOCKED ERROR')
        }
        expect(spy).toHaveBeenCalledTimes(2)
    })
})
