# CafeOS Edge node-agent

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache wget && corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/node-agent ./apps/node-agent

RUN pnpm install --frozen-lockfile
RUN pnpm --filter './packages/**' build
RUN pnpm --filter @cafeos/node-agent build
RUN pnpm --filter @cafeos/node-agent deploy --prod /app/out

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
ENV NODE_ENV=production

COPY --from=build /app/out ./
COPY --from=build /app/apps/node-agent/dist ./dist

EXPOSE 3100
CMD ["node", "dist/main.js"]
