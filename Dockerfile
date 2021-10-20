FROM node:12-slim as base
EXPOSE 3000
RUN mkdir /app && chown -R node:node /app
WORKDIR /app
USER node
COPY --chown=node:node package*.json tsconfig.json ./
COPY --chown=node:node dist ./dist
RUN npm ci && npm cache clean --force
CMD ["node", "./dist/src/server.js"]