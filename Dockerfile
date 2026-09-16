FROM node:24.20.0-alpine3.24@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm \
    && pnpm install --frozen-lockfile

COPY index.html vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.31.6-alpine3.24@sha256:b54ac358b83fc6c965793fd271839b4ea4cdb6e99895bb19618cbc2ca152d972

USER root
RUN rm -rf /usr/share/nginx/html/*

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail --silent --show-error --output /dev/null http://127.0.0.1:8080/healthz || exit 1
