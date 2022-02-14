import { gateway } from '../../src/microservices/gateway'

// Mocks
// got is mocked manually in ./__mocks__/
jest.mock('got')

describe('Gateway Microservice', () => {
    it('Do logins', async () => {
        const spy = jest.spyOn(gateway, 'login')
        const response = await gateway.login()
        expect(spy).toHaveBeenCalled()
        expect(response).toEqual('Login succesful')
    })
})
