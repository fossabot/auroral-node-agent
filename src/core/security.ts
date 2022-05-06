import { gateway } from '../microservices/gateway'
import { redisDb } from '../persistance/redis'
import { registrationFuncs } from '../persistance/models/registrations'
import { logger } from '../utils'
import { ContractType, ContractItemType, WholeContractType } from '../types/misc-types'

// Public

export const security = {
    getItemsPrivacy: async (id?: string) => {
        // TBD handle if privacy not available
        return registrationFuncs.getPrivacy(id)
    },
    cacheItemsPrivacy: async (): Promise<void> => {
        const response = await gateway.getItemsPrivacy()
        const items = response.message ? response.message : []
        await registrationFuncs.setPrivacy(items)
    },
    contractExists: async (cid: string): Promise<boolean> => {
        const ct = await redisDb.get('contract:' + cid)
        if (!ct) {
            return downloadContract(cid)
        } else if (ct === 'NOT_EXISTS') {
            logger.warn('There is no contract with this company: ' + cid)
            return false
        } else {
            return true
        }
    },
    canWriteItem: async (ctid: string, oid: string): Promise<boolean> => {
        const rw = await redisDb.hget(ctid, oid)
        return rw === 'true'
    },
    delContract: async (data: ContractType): Promise<void> => {
        await redisDb.remove('contract:' + data.cid)
        await removeContractInfo(data.ctid)
    },
    getContract: async (cid: string): Promise<WholeContractType> => {
        const ctid = await redisDb.get('contract:' + cid)
        if (!ctid) {
            await downloadContract(cid)
        }
        if (!ctid || ctid === 'NOT_EXISTS') {  
            return {
                ctid: 'NOT_EXISTS', cid, items: []
            }
        } else {
            const contract = await redisDb.hgetall(ctid)
            if (contract) {
                const keys = Object.keys(contract)
                const items: { oid: string, rw: boolean }[] = []
                for (const key of keys) {
                    items.push({ oid: key, rw: contract[key] === 'true' })
                }
                return {
                    cid, ctid, items
                }
            } else {
                return {
                    cid, ctid, items: []
                }
            }
        }
    },
    updItemInContract: async (data: ContractItemType): Promise<void> => {
        if (data.ctid && data.oid && data.cid) {
            // Check if contract is stored in node
            const ctid = await redisDb.get('contract:' + data.cid)
            if (ctid && ctid !== 'NOT_EXISTS') {
                // If rw property is false or missing --> set to 'false'
                const rw = data.rw ? 'true' : 'false'
                await redisDb.hdel(data.ctid, data.oid)
                if (await redisDb.hset(data.ctid, data.oid, rw)) {
                    logger.info('Contract ' + data.ctid + ' was updated')
                } else {
                    logger.warn('Contract ' + data.ctid + ' could not be updated...')
                }
            } else {
                if (await downloadContract(data.cid)) {
                    logger.info('Contract downloaded and stored: ' + data.ctid)
                } else {
                    logger.warn('Contract could not be downloaded: ' + data.ctid)
                }
            }
        } else {
            logger.warn('Missing oid or ctid or cid, could not update item in contract...')
        }
    },
    delItemInContract: async (data: ContractItemType): Promise<void> => {
        if (data.ctid && data.oid) {
            if (await redisDb.hdel(data.ctid, data.oid)) {
                logger.info('Item ' + data.oid + ' removed from contract: ' + data.ctid)
            } else {
                logger.warn('Item ' + data.oid + ' could not be removed from contract: ' + data.ctid + ' because contract is not stored locally')
            }
        } else {
            logger.warn('Missing oid or ctid, could not delete item from contract...')
        }
    }
}

// Private

const downloadContract = async (cid: string): Promise<boolean> => {
    // Download
    const contract = (await gateway.getContracts(cid)).message
    if (contract && contract.ctid) {
    // If contract in cloud store it and add key with TTL 1 day --> return true
        // Reset contract info -> remove and then add new
        await removeContractInfo(contract.ctid)
        await redisDb.remove('contract:' + cid)
        await addContract(contract)
        // Keep local copy of contract for an hour
        await redisDb.set('contract:' + cid, contract.ctid, 30 * 60) // persists contract 30min
        return true
    } else {
    // If contract NOT in cloud add key with TTL 5 min that returns 'null' --> return false
        await redisDb.remove('contract:' + cid)
        await redisDb.set('contract:' + cid, 'NOT_EXISTS', 300) // persists a Not_Exists flag 5 min
        return false
    }
}

/**
 * Creates a contract and adds its items
 * @param data
 */
const addContract = async (data: WholeContractType) => {
    for (let i = 0, l = data.items.length; i < l; i++) {
        const it = data.items[i]
        const rw = it.rw ? 'true' : 'false'
        await redisDb.hset(data.ctid, it.oid, rw)
    }
    logger.info('Contract ' + data.ctid + ' info was added!')
}

/**
 * Removes all items in a contract
 * @param ctid 
 */
const removeContractInfo = async (ctid: string) => { 
    const contract = await redisDb.hgetall(ctid)
    if (contract) {
        const keys = Object.keys(contract)
        for (const it of keys) {
            await redisDb.hdel(ctid, it)
        }
        logger.warn('Contract ' + ctid + ' info was removed...')
    } else {
        logger.warn('Contract does not exist yet')
    }
}

