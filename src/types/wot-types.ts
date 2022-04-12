/** ******************************************************************************
 * Copyright (c) 2018 - 2021 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ******************************************************************************* */

// Ignored because of circular definitions
/* eslint-disable no-use-before-define */

import { JsonType, CONTENT_TYPE_ENUM } from './misc-types'

export const DEFAULT_CONTEXT = 'https://www.w3.org/2019/wot/td/v1'
export const DEFAULT_CONTEXT_LANGUAGE = 'en'
export const DEFAULT_THING_TYPE = 'Thing'

/* TODOs / Questions
 ~ In Thing index structure could be read-only (sanitizing needs write access)
*/

export declare type MultiLanguage = Record<string, unknown> // object?

/** Implements the Thing Description as software object */
export class Thing {
    id?: string // AURORAL Extension --> Added by Agent on Registration == OID
    '@context': string // AURORAL Extension
    '@type': string | string[] // AURORAL Extension
    title: string
    titles?: MultiLanguage
    description?: string
    descriptions?: MultiLanguage
    adapterId: string // AURORAL Extension
    support?: string
    modified?: string
    created?: string
    version?: VersionInfo
    securityDefinitions?: {
        [key: string]: SecurityType
    }

    security: Array<string>
    base?: string

    // AURORAL extension for static location
    located_in?: {
        location_type: string, // Annotation with some building/location/place ontology
        location_id?: string, // IRI that uniquely identifies the location, i.e. http://dbpedia.org/Greece
        label?: string // Human readable description
    }

    properties: JsonType<ThingProperty>

    actions: JsonType<ThingAction>

    events: JsonType<ThingEvent>

    links: Array<Link>
    forms?: Array<Form>

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    [key: string]: any

    constructor(title: string, adapterId: string) {
        this['@context'] = DEFAULT_CONTEXT
        this['@type'] = DEFAULT_THING_TYPE
        this.title = title
        this.adapterId = adapterId
        this.security = []
        this.properties = {}
        this.actions = {}
        this.events = {}
        this.links = []
    }

    public setId = (id: string): void => {
        this.id = id
    }

    public buildThing = (data: Thing): void => {
        Object.assign(this, { ...data, setId: this.setId, buildThing: this.buildThing })
    }
}

/** Basis from implementing the Thing Interaction descriptions for Property, Action, and Event */
export interface ThingInteraction {
    title?: string
    titles?: MultiLanguage
    measures?: string | string[] // AURORAL Extension
    description?: string
    descriptions?: MultiLanguage
    scopes?: Array<string>
    uriVariables?: JsonType<DataSchema>
    security?: Array<string>
    forms?: Array<Form>

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    [key: string]: any
}

export class ExpectedResponse implements ExpectedResponse {
    contentType?: CONTENT_TYPE_ENUM
}

/** Implements the Interaction Form description */
export class Form implements Form {
    href: string
    subprotocol?: string
    op?: string | Array<string>
    contentType?: CONTENT_TYPE_ENUM
    security?: Array<string> // WoT.Security
    scopes?: Array<string>
    response?: ExpectedResponse

    constructor(href: string, contentType?: CONTENT_TYPE_ENUM) {
        this.href = href
        if (contentType) {
            this.contentType = contentType
        }
    }
}

/** Carries version information about the TD instance. If required, additional version information such as firmware and hardware version (term definitions outside of the TD namespace) can be extended here. */
export interface VersionInfo {
    instance?: string
}

export interface Link {
    href: string
    rel?: string | Array<string>
    type?: string // media type hint, no media type parameters
    anchor?: string
}

export interface ExpectedResponse {
    contentType?: CONTENT_TYPE_ENUM
}

export interface Form {
    href: string
    subprotocol?: string
    op?: string | Array<string>
    contentType?: CONTENT_TYPE_ENUM // media type + parameter(s), e.g., text/plaincharset=utf8
    security?: Array<string> // Set of security definition names, chosen from those defined in securityDefinitions  // Security
    scopes?: Array<string>
    response?: ExpectedResponse
}

export type DataSchema = BooleanSchema | IntegerSchema | NumberSchema | StringSchema | ObjectSchema | ArraySchema | NullSchema

export class BaseSchema {
    type?: string
    title?: string
    titles?: MultiLanguage
    description?: string
    descriptions?: MultiLanguage
    writeOnly?: boolean
    readOnly?: boolean
    oneOf?: Array<DataSchema>
    unit?: string
    const?: unknown
    enum?: Array<unknown>
}

export interface BooleanSchema extends BaseSchema {
    type: 'boolean'
}

export interface IntegerSchema extends BaseSchema {
    type: 'integer'
    minimum?: number
    maximum?: number
}

export interface NumberSchema extends BaseSchema {
    type: 'number'
    minimum?: number
    maximum?: number
}

export interface StringSchema extends BaseSchema {
    type: 'string'
}

export interface ObjectSchema extends BaseSchema {
    type: 'object'
    properties: JsonType<DataSchema>
    required?: Array<string>
}

export interface ArraySchema extends BaseSchema {
    type: 'array'
    items: DataSchema
    minItems?: number
    maxItems?: number
}

export interface NullSchema extends BaseSchema {
    type: 'null'
}

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

/** Implements the Thing Property description */
export abstract class ThingProperty extends BaseSchema implements ThingInteraction {
    // writable: boolean
    observable?: boolean
    type?: string

    // ThingInteraction
    forms?: Array<Form>
    title?: string
    titles?: MultiLanguage
    monitors?: string | string[]  // AURORAL Extension
    parameters?: string | string[] // AURORAL Extension - Query parameters names
    description?: string
    descriptions?: MultiLanguage
    scopes?: Array<string>
    uriVariables?: JsonType<DataSchema>

    security?: Array<string>

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    [key: string]: any
}

/** Implements the Thing Action description */
export abstract class ThingAction implements ThingInteraction {
    input?: DataSchema
    output?: DataSchema
    safe?: boolean
    idempotent?: boolean

    // ThingInteraction
    forms?: Array<Form>
    title?: string
    titles?: MultiLanguage
    
    affects?: string | string[]  // AURORAL Extension
    description?: string
    descriptions?: MultiLanguage
    scopes?: Array<string>
    uriVariables?: {
        [key: string]: DataSchema
    }

    security?: Array<string>

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    [key: string]: any
}
/** Implements the Thing Event description */
export abstract class ThingEvent implements ThingInteraction {
    subscription?: DataSchema
    data?: DataSchema
    cancellation?: DataSchema

    // ThingInteraction
    forms?: Array<Form>
    title?: string
    titles?: MultiLanguage
    monitors?: string | string[]  // AURORAL Extension
    description?: string
    descriptions?: MultiLanguage
    scopes?: Array<string>
    uriVariables?: {
        [key: string]: DataSchema
    }

    security?: Array<string>

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    [key: string]: any
}

// WoT Thing Example

// {
//     "@context": [
//         "https://www.w3.org/2019/wot/td/v1",
//         { "saref": "https://w3id.org/saref#" }
//     ],
//     "title": "MyLampThing",
//     "id" : "bb2b1770-3308-4d74-be2e-aaa6faccf018",
//     "@type": "saref:LightSwitch",
//     "securityDefinitions": {"basic_sc": {
//         "scheme": "basic",
//         "in": "header"
//     }},
//     "security": ["basic_sc"],
//     "properties": {
//         "status": {
//             "@type": "saref:OnOffState",
//             "type": "string",
//             "forms": [{
//                 "href": "https://mylamp.example.com/status"
//             }]
//         }
//     },
//     "actions": {
//         "toggle": {
//             "@type": "saref:ToggleCommand",
//             "forms": [{
//                 "href": "https://mylamp.example.com/toggle"
//             }]
//         }
//     },
//     "events": {
//         "overheating": {
//             "data": {"type": "string"},
//             "forms": [{
//                 "href": "https://mylamp.example.com/oh"
//             }]
//         }
//     }
// }
