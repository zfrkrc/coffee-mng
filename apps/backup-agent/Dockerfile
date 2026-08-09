# CafeOS Edge backup-agent

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache wget postgresql-client gzip && corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/backup-agent ./apps/backup-agent

RUN pnpm install --frozen-lockfile
RUN pnpm --filter './packages/**' build
RUN pnpm --filter @cafeos/backup-agent build
RUN pnpm --filter @cafeos/backup-agent deploy --prod /app/out

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client gzip
ENV NODE_ENV=production

COPY --from=build /app/out ./
COPY --from=build /app/apps/backup-agent/dist ./dist

EXPOSE 3200
CMD ["node", "dist/main.js"]
