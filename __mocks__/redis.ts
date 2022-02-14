type CB = (a: boolean, b: any) => {}

// eslint-disable-next-line import/no-default-export
export default {
    createClient: () => {
        return {
            ping: (cb: CB) => {
                cb(false, 'OK') 
            },
            save: (cb: CB) => {
                cb(false, true) 
            },
            get: (a: string, cb: CB) => {
                cb(false, 'string') 
            },
            set: (a: string, b: string, cb: CB) => {
                cb(false, true) 
            },
            del: (a: string, cb: CB) => {
                cb(false, true) 
            },
            hget: (a: string, b: string, cb: CB) => {
                cb(false, 'string') 
            },
            hdel: (a: string, b: string, cb: CB) => {
                cb(false, true) 
            },
            hset: (a: string, b: string, c: string, cb: CB) => {
                cb(false, true) 
            },
            hgetall: (a: string, cb: CB) => {
                cb(false, { test: true }) 
            },
            hexists: (a: string, b: string, cb: CB) => {
                cb(false, true) 
            },
            scard: (a: string, cb: CB) => {
                cb(false, 2) 
            },
            sadd: (a: string, b: string, cb: CB) => {
                cb(false, true) 
            },
            srem: (a: string, b: string, cb: CB) => {
                cb(false, true) 
            },
            sismember: (a: string, b: string, cb: CB) => {
                cb(false, false) 
            },
            smembers: (a: string, cb: CB) => {
                cb(false, ['a','b']) 
            }
        }
    }
}
