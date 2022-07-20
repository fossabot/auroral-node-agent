
jest.mock('redis')
jest.mock('../../src/config')
jest.mock('../../src/utils/logger')
jest.mock('../../src/core/mapping')
jest.mock('../../src/core/scheduler')
jest.mock('cron')


/* eslint-disable import/order */
/* eslint-disable import/first */
import * as main from '../../src/core/main'
import redis from '../../__mocks__/redis'
import * as con from '../../src/config'
import * as persistance from '../../src/persistance/persistance'
import { gtwServices }  from '../../src/core/gateway'
import { storeMapping }  from '../../src/core/mapping'
import { security }  from '../../src/core/security'
import { discovery }  from '../../src/core/collaboration'
import * as  scheduledJobs  from '../../src/core/scheduler'
import * as  gateway  from '../../src/microservices/gateway'

const myGateway = gateway.gateway as jest.Mocked<typeof gateway.gateway>
const myConfig = con.Config as jest.Mocked<typeof con.Config>

// const myGateway = gateway.gateway as jest.Mocked<typeof gateway.gateway>
// const myPersistance = persistance.persistance as jest.Mocked<typeof persistance.persistance>

beforeEach(() => {
    redis.__notFail()
})

afterEach(() => {    
    jest.clearAllMocks()
})

describe('Main core', () => {
    it('Do initialize', async () => {
        const spy = jest.spyOn(main, 'initialize')
        jest.spyOn(persistance, 'getItem').mockResolvedValue(['item1'])
        jest.spyOn(gtwServices, 'doLogins').mockResolvedValue()
        jest.spyOn(gtwServices, 'compareLocalAndRemote').mockReturnValue(true)
        jest.spyOn(security, 'cacheItemsPrivacy').mockResolvedValue()
        jest.spyOn(discovery, 'reloadCid').mockResolvedValue('cid')
        jest.spyOn(discovery, 'reloadPartnerInfo').mockResolvedValue({ name: 'NAME', nodes: [] })
        jest.spyOn(discovery, 'reloadPartners').mockResolvedValue(['cid1', 'cid2'])
        jest.spyOn(persistance, 'reloadConfigInfo').mockResolvedValue()
        jest.spyOn(myGateway, 'getRegistrations').mockResolvedValue({ error: false, message: ['item1'], statusCode: 200, statusCodeReason: '', contentType: '' })
        jest.spyOn(global, 'setTimeout').mockReturnValue(1)

        // 1
        await main.initialize()
        // 2
        myConfig.WOT.ENABLED = false
        myConfig.DB.CACHE = false
        await main.initialize()
        // 3
        myConfig.GATEWAY = JSON.parse('{  }')
        try {
            await main.initialize()
        } catch (err) {
            expect(JSON.stringify(err)).toMatch('{}')
        }
        expect(spy).toHaveBeenCalledTimes(3)
    })
    it('Do stop', async () => {
        const spy = jest.spyOn(main, 'stop')
        jest.spyOn(persistance, 'getItem').mockResolvedValue(['item1'])
        jest.spyOn(gtwServices, 'doLogouts').mockResolvedValue()
        await main.stop()
        expect(spy).toHaveBeenCalledTimes(1)
    })
})
