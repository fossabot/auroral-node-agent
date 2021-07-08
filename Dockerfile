# TODO add testing step
FROM node:12-slim as base
EXPOSE 3000
RUN mkdir /app && chown -R node:node /app
RUN npm install -g typescript concurrently
WORKDIR /app
USER node
COPY --chown=node:node package*.json tsconfig.json ./
RUN npm ci && npm cache clean --force 

FROM base as source
COPY --chown=node:node src ./src
RUN tsc

FROM source as prod
# ENV NODE_ENV=production
RUN rm -rf node_modules
RUN npm ci && npm cache clean --force
CMD ["node", "./dist/src/server.js"]