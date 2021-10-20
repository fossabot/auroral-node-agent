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
