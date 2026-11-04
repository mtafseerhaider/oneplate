FROM node:22-alpine AS build
WORKDIR /repo
COPY app ./app
COPY apps/web ./apps/web
RUN cd apps/web && node scripts/build.mjs
FROM caddy:2-alpine
COPY infra/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
