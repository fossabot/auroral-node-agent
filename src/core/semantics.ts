/**
 * SPARQL support modules
 * Custom queries
 * Common methods
 */

import { logger } from '../utils'

export const prefix = {
    rdf: 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>',
    rdfs: 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
    td: 'PREFIX td: <https://www.w3.org/2019/wot/td#>',
    foaf: 'PREFIX foaf: <http://xmlns.com/foaf/0.1>',
    geo: 'PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos>',
    saref: 'PREFIX saref: <https://saref.etsi.org/core>',
    core: 'PREFIX core: <https://auroral.iot.linkeddata.es/def/core#>', // AURORAL
    owl: 'PREFIX owl: <http://www.w3.org/2002/07/owl>',
    xsd: 'PREFIX xsd: <http://www.w3.org/2001/XMLSchema>'
}

export const queries = {
    getDatapoints:
    `PREFIX td: <https://www.w3.org/2019/wot/td#>
    SELECT ?oid ?itemname ?propname ?pid ?type ?datatype ?units ?desc WHERE { 
        ?td td:hasPropertyAffordance ?property .
        ?td td:title ?itemname .
        ?property td:title ?propname .
        ?property td:name ?pid .
        OPTIONAL { ?property td:type ?datatype . }
        OPTIONAL { ?property td:measures ?units . }
        OPTIONAL { ?property td:monitors ?type . }
        OPTIONAL { ?property td:description ?desc . }
        BIND ( replace(str(?td), 'https://oeg.fi.upm.es/wothive/', '', 'i') as ?oid)
     }`,
     getOids:
     `PREFIX td: <https://www.w3.org/2019/wot/td#>
     SELECT distinct ?oid ?name ?adapterId ?type ?semantic WHERE { 
        ?td td:title ?name . 
        ?td td:adapterId ?adapterId .
        OPTIONAL { ?td td:type ?type . }
        BIND ( replace(str(?td), 'https://oeg.fi.upm.es/wothive/', '', 'i') as ?oid)
      } `,
      getByName: (x: string): string | null => {
        switch (x) {
            case 'getDatapoints':
                return queries.getDatapoints
            case 'getOids':
                return queries.getOids
            default:
                logger.warn('Wrong predifined query type')
                return null
        } 
      }
}
