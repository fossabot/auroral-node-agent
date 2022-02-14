import * as persistance from '../../src/persistance/persistance'

// Mocks
// redis is mocked manually in ./__mocks__/
jest.mock('redis')

describe('Persistance Methods', () => {
    it('Get all items registered', async () => {
        const spy = jest.spyOn(persistance, 'getItem')
        const response = await persistance.getItem('registrations')
        expect(spy).toHaveBeenCalled()
        expect(response).toEqual(['a', 'b'])
    })
})
