#!/bin/bash
USAGE="$(basename "$0") [ -h ] [ -e env ]
-- Build and publish image to docker registry
-- Flags:
      -h  shows help
      -e  environment [ dev (default), prod, ... ]"
# BUILD PLATFORMS
PLATFORMS=linux/amd64,linux/arm64,linux/arm/v7

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

# Compile ts into js
tsc

# Multiarch builder
docker buildx use multiplatform

# Build images & push to private registry
docker buildx build --platform ${PLATFORMS} \
                    --tag ${REGISTRY}/${IMAGE_NAME}:${ENV} \
                    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
                    --build-arg BUILD_VERSION="1.0" \
                    -f Dockerfile . --push
# Pull local arch version
docker pull ${REGISTRY}/${IMAGE_NAME}:${ENV}


# docker login ${GIT_REGISTRY}

# # Build images & push to github
# docker buildx build --platform ${PLATFORMS} \
#                     --tag ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV} \
#                     --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
#                     --build-arg BUILD_VERSION="1.0" \
#                     -f Dockerfile . --push
# # Pull local arch version 
# docker pull ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}
