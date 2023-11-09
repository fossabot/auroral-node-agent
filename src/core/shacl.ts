import got from 'got'
import { logger, errorHandler, HttpStatusCode, MyError } from '../utils'
import { wot } from '../microservices/wot'
import { Config } from '../config'
import { ontologyWatchdog } from '../microservices/ontology-watchdog'
import { OntologyType } from '../types/misc-types'
import { shacl } from '../microservices/shacl'

export const fillShacl = async () : Promise<any> => {
    try {
        logger.debug('Filling SHACL with ontologies')
        if (!await shacl.healthCheck()) {
            // SHACL is not enabled
            logger.debug('SHACL disabled -> skipping filling SHACL')
            return
        }
        // SHACL is enabled
        logger.debug('SHACL enabled -> filling SHACL')
        // retrieve url from Ontology watchdog
        const ontologies = await ontologyWatchdog.getAll() as any as OntologyType[]
        if (!ontologies) {
            throw new MyError('Ontologies not found in Ontology Watchdog', HttpStatusCode.BAD_REQUEST)
        }
        ontologies.forEach(async o => {
            if (o.shape && o.shape.payload) {
                logger.debug(`Ontology ${o.name} has shape - posting to SHACL`)
                logger.debug(o.id)
                logger.debug(o.context.link)
                await shacl.postShape(o.id, o.shape.payload)
            } else {
                logger.debug(`Ontology ${o.name} has no shape - skipping`)
            }
        })
    } catch (err) {
        const error = errorHandler(err)
        logger.error('SHACL error downloading ontologies: ' + error.message)
    }
}
