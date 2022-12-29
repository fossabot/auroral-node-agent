import { gateway } from '../microservices/gateway'
import { redisDb } from '../persistance/redis'
import { registrationFuncs } from '../persistance/models/registrations'
import { logger } from '../utils'
import { ContractType, ContractItemType, WholeContractType, DLTContractType } from '../types/misc-types'
import { Config } from '../config'
import { discovery } from '../core/collaboration'

// Public

export const security = {
    getItemsPrivacy: async (id?: string) => {
        // TBD handle if privacy not available
        return registrationFuncs.getPrivacy(id)
    },
    cacheItemsPrivacy: async (): Promise<void> => {
        const response = await gateway.getItemsPrivacy()
        const items = response.message ? response.message : []
        await registrationFuncs.setPrivacyAndStatus(items)
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
        let ctid = await redisDb.get('contract:' + cid)
        if (!ctid) {
            // download + retry
            await downloadContract(cid)
            ctid = await redisDb.get('contract:' + cid)
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
        if (!(data.ctid && data.oid && data.cid)) {
            logger.warn('Missing oid or ctid or cid, could not update item in contract...')
            return
        }
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
    if (Config.DLT.ENABLED) {
        return downloadContractDlt(cid)
    } else {
        return downloadContractCloud(cid)
    }
}

const downloadContractCloud = async (cid: string): Promise<boolean> => {
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

const downloadContractDlt = async (cid: string): Promise<boolean> => {
    let flag = false // Returns true if cid found in any contract, otherwise false
    const contracts = (await gateway.getContractsDlt()).message
    const mycid = await discovery.getCid(Config.GATEWAY.ID)
    if (contracts.length > 0) {
        for (let i = 0, len = contracts.length; i <= len; i++) { 
            const ct = contracts[i]
            if (ct.orgs.length === 2 && ct.orgs.indexOf(mycid) !== -1) {
                // Return true if cid found in contracts
                if (ct.orgs.indexOf(cid) !== -1) {
                    flag = true
                }
                // Find foreign CID in orgs array
                const indexOfMyCid = ct.orgs.indexOf(mycid) // Position 0 or 1
                const foreignCid = ct.orgs[1 - indexOfMyCid] // It is the position where my CID isn't
                // If contract in cloud store it and add key with TTL 1 day --> return true
                // Reset contract info -> remove and then add new
                await removeContractInfo(ct.contract_id)
                await redisDb.remove('contract:' + foreignCid)
                await addContractDlt(ct)
                // Keep local copy of contract for an hour
                await redisDb.set('contract:' + foreignCid, ct.contract_id, 30 * 60) // persists contract 30min
            } else {
                // If orgs array does not contain mine and foreign CID do nothing
                logger.warn('DLT contract ' + ct.contract_id + ' is corrupted, contact admin, ignoring...')
            }
        }
        return flag
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
 * Creates a contract and adds its items
 * @param data
 */
const addContractDlt = async (data: DLTContractType) => {
    for (let i = 0, l = data.items.length; i < l; i++) {
        const it = data.items[i]
        const rw = it.write ? 'true' : 'false'
        await redisDb.hset(data.contract_id, it.object_id, rw)
    }
    logger.info('Contract ' + data.contract_id + ' info was added!')
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

