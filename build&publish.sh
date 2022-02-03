#!/bin/bash
USAGE="$(basename "$0") [ -h ] [ -v version]
-- Build and publish image to docker registry
-- Flags:
      -h  shows help
      -v  version [ i.e. 1.0, 2.2,... ]"

# BUILD PLATFORMS 
PLATFORMS=linux/amd64,linux/arm64,linux/arm/v7
VERSION=0
LATEST=0 # If 1 build image with latest tag

# Default configuration
ENV=dev
REGISTRY=registry.bavenir.eu
IMAGE_NAME=auroral_agent

# Github configuration
GIT_ENV=beta
GIT_REGISTRY=ghcr.io
GIT_IMAGE_NAME=auroralh2020/auroral-node-agent

# Get configuration
while getopts 'hd:v:' OPTION; do
case "$OPTION" in
    h)
    echo "$USAGE"
    exit 0
    ;;
    v)
    VERSION="$OPTARG"
    ;;
esac
done

# Update to VERSION if any
if [ ${VERSION} != 0 ]
then
    ENV=${VERSION}
    GIT_ENV=${VERSION}
    LATEST=1
    echo Do you wish to continue pushing version ${VERSION} ?
    select yn in "Yes" "No"; do
    case $yn in
        Yes ) echo Updating image version!; break;;
        No ) echo Aborting...; exit;;
    esac
    done
fi

# Start build
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
                    --build-arg BUILD_VERSION=${VERSION} \
                    -f Dockerfile . --push

# Pull local arch version
docker pull ${REGISTRY}/${IMAGE_NAME}:${ENV}


# docker login ${GIT_REGISTRY}

# Build images & push to github
docker buildx build --platform ${PLATFORMS} \
                    --tag ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV} \
                    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
                    --build-arg BUILD_VERSION=${VERSION} \
                    -f Dockerfile . --push

# Build latest when new version

if [ ${LATEST} == 1 ]
then
    docker buildx build --platform ${PLATFORMS} \
                        --tag ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:latest \
                        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
                        --build-arg BUILD_VERSION=${VERSION} \
                        -f Dockerfile . --push
fi

# Pull local arch version 
docker pull ${GIT_REGISTRY}/${GIT_IMAGE_NAME}:${GIT_ENV}

# END
echo Build and publish ended successfully!
