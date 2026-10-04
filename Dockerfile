FROM node:24-slim AS build
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src src
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /srv
COPY --from=build /srv/node_modules node_modules
COPY --from=build /srv/dist dist
COPY package.json .
USER 1000
EXPOSE 8080
CMD ["node", "dist/server.js"]
