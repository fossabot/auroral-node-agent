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
docker login ${REGISTRY}

# Multiarch builder
docker buildx use multiplatform

# Build for AMD64/ARM64 & push to private registry
docker buildx build --platform linux/amd64,linux/arm64 --tag ${REGISTRY}/${IMAGE_NAME}:${ENV} -f Dockerfile . --push
docker pull ${REGISTRY}/${IMAGE_NAME}:${ENV}

# Build for ARMv7 & push to private registry
docker buildx build --platform linux/arm/v7 --tag ${REGISTRY}/${IMAGE_NAME}:armv7 -f Dockerfile.armv7 . --push
docker pull ${REGISTRY}/${IMAGE_NAME}:armv7

# Push to GitHub
docker login ${GIT_REGISTRY}
docker image tag ${REGISTRY}/${IMAGE_NAME}:${ENV} ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}
docker push ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}
docker image tag ${REGISTRY}/${IMAGE_NAME}:armv7 ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}_armv7
docker push ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}_armv7
