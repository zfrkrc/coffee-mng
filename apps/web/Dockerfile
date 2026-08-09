# CafeOS Edge Web — production image (standalone Next.js)

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat && corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter './packages/**' build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @cafeos/web build

# Deploy standalone deps into ./out (web server + node_modules).
RUN pnpm --filter @cafeos/web deploy --prod /app/out

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The standalone server from the build stage. With outputFileTracingRoot set
# to the workspace root, Next produces ./standalone/apps/web/server.js with a
# flat, self-contained node_modules at ./standalone/node_modules.
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone/ ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
