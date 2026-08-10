FROM node:24.19.0-alpine3.24@sha256:2a49bdf71e9fd965a58c1703fd9ddd205b34e5782b692a72dd1d248abb0beb43 AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm \
    && pnpm install --frozen-lockfile

COPY index.html vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.31.3-alpine3.24@sha256:72fe62fff57f9d244024b741bd0e2d62af3ce1083e331499b26a2dcf6d962732

USER root
RUN rm -rf /usr/share/nginx/html/*

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail --silent --show-error --output /dev/null http://127.0.0.1:8080/healthz || exit 1
