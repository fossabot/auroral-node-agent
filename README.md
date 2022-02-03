![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/AuroralH2020/auroral-node-agent)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/AuroralH2020/auroral-node-agent)
![GitHub issues](https://img.shields.io/github/issues-raw/AuroralH2020/auroral-node-agent)
![GitHub](https://img.shields.io/github/license/AuroralH2020/auroral-node-agent)

# AURORAL NODE AGENT #

This README documents the agent component of the AURORAL node, which is funded by European Union’s Horizon 2020 Framework Programme for Research and Innovation under grant agreement no 101016854 AURORAL.

## Pre-requisites ##

Recommended software and skills:

- GIT
- Docker
- Docker compose 

## Dependencies ##

AURORAL Node Agent is a part of the AURORAL Node, which is a client to connect IoT infrastructures with AURORAL.

For minimal functionality, the AURORAL Agent needs an instance of the AURORAL Gateway and an instance of REDIS db.

If semantic interoperability is enabled, it is necessary to run also the semantic modules.

In order to access an IoT infrastructure or platform, it is necessary to run an AURORAL Adapter.

Examples and more information about how to run the AURORAL Node Agent is available in the [AURORAL Node repository](https://github.com/AuroralH2020/auroral-node/wiki).

## Deployment ##

It is possible to run the AURORAL Node Agent as a docker image.

Refer to [AURORAL Node repository](https://github.com/AuroralH2020/auroral-node/wiki) for more information about deployment.

## Images ##

Available DOCKER images for AMD64, ARM64 and ARM7 architectures.

## API ##

To interact with the AURORAL Node Agent please follow the API specification. Once the Agent is running, the documentation is avalable under <your_host>:<your_port>/docs (Default route http:localhost:81/docs)

![SWAGGER API](src/docs/swagger.png?raw=true)

### Who do I talk to? ###

Developed by bAvenir

* jorge.almela@bavenir.eu
* peter.drahovsky@bavenir.eu