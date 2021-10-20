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

# Build depending on env
docker buildx use multiplatform
docker buildx build --platform linux/amd64,linux/arm64 --tag ${REGISTRY}/${IMAGE_NAME}:${ENV} -f Dockerfile --push .
# docker buildx build --platform linux/arm/v7 --tag ${REGISTRY}/${IMAGE_NAME}:${ENV} -f Dockerfile.armv7 --push .
# docker build --tag ${IMAGE_NAME} -f Dockerfile .
