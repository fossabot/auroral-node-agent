type CB = (a: boolean, b: any) => {}

const redis = jest.createMockFromModule('redis') as any

let fail = false
const client = {
    ping: (cb: CB) => {
        cb(fail, 'OK') 
    },
    save: (cb: CB) => {
        cb(fail, true) 
    },
    get: (a: string, cb: CB) => {
        cb(fail, 'string') 
    },
    set: (a: string, b: string, c: string, d: any, cb?: CB) => {
        if (cb) {
            cb(false, true) 
        } else {
            if (fail) {
                throw new Error('MOCK ERROR')
            }
        }
    },
    del: (a: string, cb: CB) => {
        cb(fail, true) 
    },
    hget: (a: string, b: string, cb: CB) => {
        if (fail) {
            cb(false, null) 
        } else {
            cb(fail, 'string') 
        }
    },
    hdel: (a: string, b: string, cb: CB) => {
        cb(fail, true) 
    },
    hset: (a: string, b: string, c: string, cb: CB) => {
        cb(fail, true) 
    },
    hgetall: (a: string, cb: CB) => {
        cb(fail, { test: true }) 
    },
    hexists: (a: string, b: string, cb: CB) => {
        cb(fail, true) 
    },
    scard: (a: string, cb: CB) => {
        cb(fail, 2) 
    },
    sadd: (a: string, b: string, cb: CB) => {
        cb(fail, true) 
    },
    srem: (a: string, b: string, cb: CB) => {
        cb(fail, true) 
    },
    sismember: (a: string, b: string, cb: CB) => {
        cb(fail, true) 
    },
    smembers: (a: string, cb: CB) => {
        cb(fail, ['a','b']) 
    }
}

function __toFail() {
    fail = true
}
function __notFail() {
    fail = false
}

redis.createClient = () => { 
    return client 
}
redis.__toFail = __toFail
redis.__notFail = __notFail

// eslint-disable-next-line import/no-default-export
export default redis

