ARG ARCH
ARG BUILD_DATE
ARG BUILD_VERSION
ARG BASE_IMAGE=node:12-slim 

# BUILD PHASE
FROM $BASE_IMAGE AS build-env
RUN mkdir /app && chown -R node:node /app
WORKDIR /app
USER node
COPY --chown=node:node package*.json tsconfig.json ./
# INSTALL DEPENDENCIES
# RUN npm ci --only=production && npm cache clean --force
RUN npm ci && npm cache clean --force
# COPY SOURCES
COPY --chown=node:node dist ./dist

# RUN PHASE
FROM node:12-slim
# FROM gcr.io/distroless/nodejs:12-debug
COPY --from=build-env /app /app
WORKDIR /app
EXPOSE 3000
# LABEL
LABEL maintaner="jorge.almela@bavenir.eu"
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.opencontainers.image.version=$BUILD_VERSION
LABEL org.opencontainers.image.source=https://github.com/AuroralH2020/auroral-node-agent
# START
CMD ["./dist/src/server.js"]