import { JsonType } from '../src/types/misc-types'

// eslint-disable-next-line import/no-default-export
export default {
    extend: () => {
        return async (uri: string, body: { method: string }) => {
            return Promise.resolve({ body: responses[body.method + uri] })
        }
    }
}

const responses: JsonType = {
    'GETobjects/login': 'Login succesful',
    'POSTtest/': 'test'    
}
