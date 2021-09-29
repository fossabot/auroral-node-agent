export type JsonType = {
    [x: string]: any
}

export type KeyValue = {
    key: string,
    value: string
}

export enum AdapterMode {
    PROXY = 'proxy',
    DUMMY = 'dummy'
}
