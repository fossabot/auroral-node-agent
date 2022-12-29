import { ItemPrivacy, ItemStatus } from '../persistance/models/registrations'

export type JsonType<T=any> = {
    [x: string]: T
}

export type KeyValue = {
    key: string,
    value: string
}

export enum AdapterMode {
    PROXY = 'proxy',
    DUMMY = 'dummy',
    SEMANTIC = 'semantic'
}

export interface BasicResponse<T = any> {
    error?: string
    message?: T
}

export enum RelationshipType{
    ME = 'me',
    FRIEND = 'friend',
    OTHER = 'other'
}

// Interface used to get item  privacy value from NM
export interface IItemPrivacy {
    oid: string, // Auroral Id
    privacy: ItemPrivacy, // Privacy level of the item,
    status?: ItemStatus
}

// Interfaces for Contracts
export interface ContractType {
    ctid: string,
    cid: string
}

export interface ContractItemType extends ContractType {
    cid: string,
    ctid: string,
    oid: string,
    rw?: boolean // Store as string in redis
}

export interface WholeContractType extends ContractType {
    items: { oid: string, rw: boolean }[]
}

export interface DLTContractType {
    contract_id: string
    // contract_type: string
    orgs: string[]
    items: {
        enabled: boolean
        write: boolean
        object_id: string
        org_id: string
        object_type: string
    }[]
}

// Interface for communities
export interface CommunityType {
    commId: string,
    name: string,
    description: string
}

// Header content types

export enum CONTENT_TYPE_ENUM {
    RDFN3 = 'text/rdf+n3',
	N3 = 'text/n3', 
    NTRIPLES = 'text/ntriples', 
    RDFTTL = 'text/rdf+ttl',
    RDFNT = 'text/rdf+nt', 
    PLAIN = 'text/plain', 
    RDFTURTLE = 'text/rdf+turtle', 
    TURTLE = 'text/turtle',
	APPTURTLE = 'application/turtle', 
    APPXTURTLE = 'application/x-turtle', 
    APPXNICETURTLE = 'application/x-nice-turtle', 
    JSON = 'application/json',
	ODATAJSON = 'application/odata+json', 
    JSONLD = 'application/ld+json', 
    XTRIG = 'application/x-trig', 
    RDFXML = 'application/rdf+xml'
}

export const CONTENT_TYPE_LIST = Object.values(CONTENT_TYPE_ENUM)

export type UpdateResult = {
    oid: string
    success?: boolean
    error?: string
}

export type RemoveResult = {
    oid: string
    statusCode: number
    success?: boolean
    error?: string
}

export type ThingMapping = {
    oid: string,
    mapping: string,
}

export type InteractionMapping = {
    oid: string,
    iid: string,
    mapping: string
}

