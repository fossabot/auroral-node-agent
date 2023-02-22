// TYPES

export type SecurityType =
    | NoSecurityScheme
    | BasicSecurityScheme
    | DigestSecurityScheme
    | BearerSecurityScheme
    | CertSecurityScheme
    | PoPSecurityScheme
    | APIKeySecurityScheme
    | OAuth2SecurityScheme
    | PSKSecurityScheme
    | PublicSecurityScheme

export interface SecurityScheme {
    scheme: string
    description?: string
    proxy?: string
}

export interface NoSecurityScheme extends SecurityScheme {
    scheme: 'nosec'
}

export interface BasicSecurityScheme extends SecurityScheme {
    scheme: 'basic'
    in?: string
    name?: string
}

export interface DigestSecurityScheme extends SecurityScheme {
    scheme: 'digest'
    name?: string
    in?: string
    qop?: string
}

export interface APIKeySecurityScheme extends SecurityScheme {
    scheme: 'apikey'
    in?: string
    name?: string
}

export interface BearerSecurityScheme extends SecurityScheme {
    scheme: 'bearer'
    in?: string
    alg?: string
    format?: string
    name?: string
    authorization?: string
}

export interface CertSecurityScheme extends SecurityScheme {
    scheme: 'cert'
    identity?: string
}

export interface PSKSecurityScheme extends SecurityScheme {
    scheme: 'psk'
    identity?: string
}

export interface PublicSecurityScheme extends SecurityScheme {
    scheme: 'public'
    identity?: string
}

export interface PoPSecurityScheme extends SecurityScheme {
    scheme: 'pop'
    format?: string
    authorization?: string
    alg?: string
    name?: string
    in?: string
}

export interface OAuth2SecurityScheme extends SecurityScheme {
    scheme: 'oauth2'
    authorization?: string
    flow?: string // one of implicit, password, client, or code
    token?: string
    refresh?: string
    scopes?: Array<string>
}
