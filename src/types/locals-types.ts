// Types and Ifaces for res.locals
import { RelationshipType } from './misc-types'

export type PermissionLocals = Record<string, any> | {
    relationship: RelationshipType,
    originId: string,
    items?: string[]
}
