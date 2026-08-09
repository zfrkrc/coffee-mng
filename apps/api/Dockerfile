# CafeOS Edge API — production image
# `pnpm deploy` produces a self-contained dir with a flat node_modules,
# avoiding pnpm's per-app symlink layout problems at runtime.

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl && corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter './packages/**' build
RUN pnpm --filter @cafeos/api exec prisma generate
RUN pnpm --filter @cafeos/api build

# Deploy produces ./out with package.json + node_modules (flat) + workspace deps.
# pnpm deploy does not carry the generated Prisma client (it ships the npm
# placeholder stub instead), so regenerate it inside the deployed tree.
RUN pnpm --filter @cafeos/api deploy --prod /app/out \
    && cd /app/out \
    && ./node_modules/.bin/prisma generate

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl wget
ENV NODE_ENV=production

COPY --from=build /app/out ./
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]
