# OnePlate as one service: the API also serves the built web app (WEB_DIST). Needs a PostgreSQL URL.
#   docker build -t oneplate . && docker run -p 3000:3000 -e DATABASE_URL=postgres://... -e SESSION_SECRET=... -e PUBLIC_URL=https://your.host oneplate
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY scripts ./scripts
COPY app ./app
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile=false && pnpm -r --filter @oneplate/content --filter @oneplate/core --filter @oneplate/api build && cd apps/web && node scripts/build.mjs
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo ./
ENV NODE_ENV=production PORT=3000 WEB_DIST=/repo/apps/web/dist COOKIE_SECURE=true
EXPOSE 3000
USER node
CMD ["node","apps/api/dist/server.js"]
