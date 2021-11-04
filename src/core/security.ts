import { gateway } from '../microservices/gateway'
import { registrationFuncs } from '../persistance/models/registrations'

export const security = {
    getItemsPrivacy: async (id?: string) => {
        // TBD handle if privacy not available
        return registrationFuncs.getPrivacy(id)
    },
    cacheItemsPrivacy: async (): Promise<void> => {
        const items = await gateway.getItemsPrivacy()
        await registrationFuncs.setPrivacy(items.message)
    }
}
