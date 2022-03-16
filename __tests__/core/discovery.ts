
jest.mock('../../src/microservices/gateway')
jest.mock('../../src/utils/logger')
jest.mock('redis')

/* eslint-disable import/order */
/* eslint-disable import/first */
import { discovery } from '../../src/core/discovery'
import * as  gateway  from '../../src/microservices/gateway'
import redis from '../../__mocks__/redis'

const myGateway = gateway.gateway as jest.Mocked<typeof gateway.gateway>

beforeEach(() => {
    redis.__notFail()
})

afterEach(() => {    
    jest.clearAllMocks()
})

describe('Discovery core', () => {
    it('Do getRelationship', async () => {
        const spy = jest.spyOn(discovery, 'getRelationship')
        const response = await discovery.getRelationship('oid1')
        expect(response).toMatch('me')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do getCid', async () => {
        const spy = jest.spyOn(discovery, 'getCid')
        myGateway.getCid.mockResolvedValue({ error: null, message: 'string' })
        const response = await discovery.getCid('oid1')
        expect(response).toMatch('string')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do getPartnerInfo', async () => {
        const spy = jest.spyOn(discovery, 'getPartnerInfo')
        myGateway.getPartnerInfo.mockResolvedValue({ error: null, message: { name: 'string', nodes: [] } })
        const response = await discovery.getPartnerInfo('id')
        expect(response.name).toBe('string')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do getPartners', async () => {
        const spy = jest.spyOn(discovery, 'getPartners')
        myGateway.getPartners.mockResolvedValue({ error: null, message: ['string'] })
        const response = await discovery.getPartners()
        expect(response[0]).toBe('string')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do reloadCid', async () => {
        const spy = jest.spyOn(discovery, 'reloadCid')
        myGateway.getCid.mockResolvedValue({ error: null, message: 'cid' })
        const response = await discovery.reloadCid('gtwId')
        expect(response).toBe('cid')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do reloadPartners', async () => {
        const spy = jest.spyOn(discovery, 'reloadPartners')
        myGateway.getPartners.mockResolvedValue({ error: null, message: ['partner1', 'partner2'] })
        const response = await discovery.reloadPartners()
        expect(response.toString()).toMatch('partner1')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do reloadPartnerInfo', async () => {
        const spy = jest.spyOn(discovery, 'reloadPartnerInfo')
        myGateway.getPartnerInfo.mockResolvedValue({ error: null, message: { name: 'string', nodes: [] } })
        const response = await discovery.reloadPartnerInfo('id')
        expect(response.name).toMatch('string')
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Do reloadPartnerInfo', async () => {
        const spy = jest.spyOn(discovery, 'reloadPartnerInfo')
        myGateway.getPartnerInfo.mockResolvedValue({ error: null, message: { name: 'string', nodes: [] } })
        const response = await discovery.reloadPartnerInfo('id')
        expect(response.name).toMatch('string')
        expect(spy).toHaveBeenCalledTimes(1)
    })
})
