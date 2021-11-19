#!/bin/bash
USAGE="$(basename "$0") [ -h ] [ -e env ]
-- Build and publish image to docker registry
-- Flags:
      -h  shows help
      -e  environment [ dev (default), prod, ... ]"

# Default configuration
ENV=dev
REGISTRY=registry.bavenir.eu
IMAGE_NAME=auroral_agent

# Github configuration
GIT_ENV=beta
GIT_REGISTRY=ghcr.io
GIT_IMAGE_NAME=auroralh2020/auroral-node-agent

# Get configuration
while getopts 'hd:e:' OPTION; do
case "$OPTION" in
    h)
    echo "$USAGE"
    exit 0
    ;;
    e)
    ENV="$OPTARG"
    ;;
esac
done

echo Build and push image ${IMAGE_NAME} with tag ${ENV}

# Do login
docker login ${GIT_REGISTRY}

# Compile ts into js
tsc

# Multiarch builder
docker buildx use multiplatform

# Build for AMD64/ARM64 & push to github
docker buildx build --platform linux/amd64,linux/arm64 --tag ${GIT_REGISTRY}/${IMAGE_NAME}:${GIT_ENV} -f Dockerfile . --push
docker pull ${GIT_REGISTRY}/${IMAGE_NAME}:${GIT_ENV}

# Build for ARMv7 & push to github
docker buildx build --platform linux/arm/v7 --tag ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}_armv7 -f Dockerfile.armv7 . --push
docker pull ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}_armv7

# Push to Private registry
docker login ${REGISTRY}
docker image tag ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV} ${REGISTRY}/${IMAGE_NAME}:${ENV}
docker push ${REGISTRY}/${IMAGE_NAME}:${ENV}
docker image tag ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}_armv7 ${REGISTRY}/${IMAGE_NAME}:armv7
docker push ${REGISTRY}/${IMAGE_NAME}:armv7
