import { JsonType } from '../src/types/misc-types'

let fail = false
const got = jest.createMockFromModule('got') as any

// eslint-disable-next-line import/no-default-export
function extend() {
        return async (uri: string, body: { method: string }) => {
            if (!fail) {
                return Promise.resolve({ body: responses[body.method + uri] })
            } else {
                throw new Error('MOCKED ERROR')
            }
        }
    }

function __toFail() {
    fail = true
}
function __notFail() {
    fail = false
}

const responses: JsonType = {
    'GETobjects/login': 'Login succesful',
    'POSTtest/': 'test',
    'GETobjects/logout': 'Logout succesful' ,
    'GETagents/gtwId/objects': { message: ['oid1', 'oid2'] },
    'POSTagents/gtwId/objects': 'Registration succesful',
    'PUTagents/gtwId/objects': 'Registration update succesful',
    'POSTagents/gtwId/objects/delete': 'Remove registration succesful',
    'GETobjects': 'Discovery succesful',
    'POSTobjects/oid1': 'DiscoveryRemote succesful',
    'GETagents/cid/oid1': { message: 'GetCid succesful' } ,
    'GETagents/partners': { message: 'GetPartners succesful' },
    'GETagents/partner/cid': { message: 'GetPartnerInfo succesful' },
    'GETobjects/roid/properties/pid': 'GetProperty succesful',
    'PUTobjects/roid/properties/pid': 'PutProperty succesful',
    'POSTevents/eid': 'ActivateEventChannel succesful',
    'PUTevents/eid': 'PublishEvent succesful',
    'DELETEevents/eid': 'DeactivateEventChannel succesful',
    'GETobjects/roid/events/eid': 'StatusRemoteEventChannel succesful',
    'POSTobjects/roid/events/eid': 'SubscribeRemoteEventChannel succesful',
    'DELETEobjects/roid/events/eid': 'UnsubscribeRemoteEventChannel succesful',
    'GETsecurity/relationship/rid': 'GetRelationship succesful',
    'GETsecurity/privacy': 'GetItemsPrivacy succesful',
    'GETsecurity/contracts/cid': { message: 'GetContracts succesful' },
    // objects/login
}

got.extend = extend
got.__toFail = __toFail
got.__notFail = __notFail

// eslint-disable-next-line import/no-default-export
export default got
