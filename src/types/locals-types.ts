// Types and Ifaces for res.locals
import { RelationshipType } from './misc-types'

export type PermissionLocals = {
    relationship: RelationshipType,
    items?: string[]
}
