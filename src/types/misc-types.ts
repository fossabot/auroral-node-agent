import { ItemPrivacy } from '../persistance/models/registrations'

export type JsonType<T=any> = {
    [x: string]: T
}

export type KeyValue = {
    key: string,
    value: string
}

export enum AdapterMode {
    PROXY = 'proxy',
    DUMMY = 'dummy'
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
    privacy: ItemPrivacy, // Privacy level of the item
}

