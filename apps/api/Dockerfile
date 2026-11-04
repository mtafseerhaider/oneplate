FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile=false && pnpm -r --filter @oneplate/content --filter @oneplate/core --filter @oneplate/api build
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo ./
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node","apps/api/dist/server.js"]
