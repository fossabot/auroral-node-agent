type CB = (a: boolean, b: any) => {}

const redis = jest.createMockFromModule('redis') as any

let fail = false
const client = {
    ping: () => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve('OK')
            }
        })
    },
    save: () => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })
    },
    get: (a: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve('string')
            }
        })
    },
    set: (a: string, b: string, c: string, d: any) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })
    },
    del: (a: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })
    },
    hGet: (a: string, b: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve('string')
            }
        })
    },
    hDel: (a: string, b: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })
    },
    hSet: (a: string, b: string, c: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })
    },
    hGetAll: (a: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve({ test: true })
            }
        }) 
    },
    hExists: (a: string, b: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })    
    },
    sCard: (a: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(2)
            }
        })    
    },
    sAdd: (a: string, b: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })
    },
    sRem: (a: string, b: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        })
    },
    sIsMember: (a: string, b: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(true)
            }
        }) 
    },
    sMembers: (a: string) => {
        return new Promise((resolve, reject) => {
            if (fail) {
                reject(new Error('Test Error'))
            } else {
                resolve(['a','b'])
            }
        })    
    }
}

function __toFail() {
    fail = true
}
function __notFail() {
    fail = false
}

export const createClient = () => { 
    return client 
}

redis.__toFail = __toFail
redis.__notFail = __notFail

// eslint-disable-next-line import/no-default-export
export default redis

