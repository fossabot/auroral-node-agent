import Mustache from 'mustache'
import { logger } from '../utils'
import { Config } from '../config'
import { Thing } from '../types/wot-types'
import { Interaction } from './data'

const interactionUrl = Config.ADAPTER.HOST + ':' + Config.ADAPTER.PORT + '/api/{{interaction}}/{{oid}}/{{iid}}'

export const tdProxyEnrichment =  (td: Thing): Thing => {
    logger.debug('TD enrichment')
    // Properties
    if (td.properties) {
        for (let i = 0; i < Object.keys(td.properties).length; i++) {
            const object = td.properties[Object.keys(td.properties)[i]]
            if (object.readOnly === true || object.readOnly === undefined) {
                object.readOnly = true
                td.properties[Object.keys(td.properties)[i]].forms = 
                [{ 
                    op: ['readproperty'], 
                    href: Mustache.render(interactionUrl, { interaction: Interaction.PROPERTY, oid: td.id, iid: Object.keys(td.properties)[i] }) 
                }]
            } else {
                td.properties[Object.keys(td.properties)[i]].forms = 
                [{
                    op: ['readproperty', 'writeproperty'],
                    href: Mustache.render(interactionUrl, { interaction: Interaction.PROPERTY, oid: td.id, iid: Object.keys(td.properties)[i] }) 
                }]
            }
        }
    }
    // Events
    if (td.events) {
        for (let i = 0; i < Object.keys(td.events).length; i++) {
            td.events[Object.keys(td.events)[i]].forms = 
            [{ 
                op: ['subscribeevent'], 
                href: Mustache.render(interactionUrl, { interaction: Interaction.EVENT, oid: td.id, iid: Object.keys(td.events)[i] }) 
            }]
        }
    }
    // TBD: Actions? Not yet implemented
    return td
}
