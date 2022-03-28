import Mustache from 'mustache'
import { logger } from '../utils'
import { Config } from '../config'
import { Thing } from '../types/wot-types'
import { Interaction } from './data'

const interactionUrl = Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT + '/api/{{interaction}}/{{oid}}/{{iid}}'

export const tdProxyEnrichment =  (td: Thing): Thing => {
    logger.debug('TD enrichment')
    // Properties
    for (let i = 0; i < Object.keys(td.properties).length; i++) {
        const object = td.properties[Object.keys(td.properties)[i]]
        if (object.readOnly === true || object.readOnly === undefined) {
            object.readOnly = true
            td.properties[Object.keys(td.properties)[i]].forms = 
            [{ 
                op: ['readproperty'], 
                href: Mustache.render(interactionUrl, { interaction: Interaction.PROPERTY, oid: td.id, iid: object['@id'] }) 
            }]
        } else {
            td.properties[Object.keys(td.properties)[i]].forms = 
            [{
                op: ['readproperty', 'writeproperty'],
                href: Mustache.render(interactionUrl, { interaction: Interaction.PROPERTY, oid: td.id, iid: object['@id'] }) 
            }]
        }
    }
    // Events
    for (let i = 0; i < Object.keys(td.events).length; i++) {
        const object = td.events[Object.keys(td.events)[i]]
        if (object.readOnly === true || object.readOnly === undefined) {
            object.readOnly = true
            td.events[Object.keys(td.events)[i]].forms = 
            [{ 
                op: ['readproperty'], 
                href: Mustache.render(interactionUrl, { interaction: Interaction.EVENT, oid: td.id, iid: object['@id'] }) 
            }]
        } else {
            td.events[Object.keys(td.events)[i]].forms = 
            [{
                op: ['readproperty', 'writeproperty'],
                href: Mustache.render(interactionUrl, { interaction: Interaction.EVENT, oid: td.id, iid: object['@id'] }) 
            }]
        }
    }
    // TBD: Actions?
    return td
}
