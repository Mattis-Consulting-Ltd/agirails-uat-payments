FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/frontend/package.json packages/frontend/
RUN npm install --workspace=packages/frontend

FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/package.json ./
COPY tsconfig.base.json ./
COPY packages/frontend/ packages/frontend/

RUN npm run build --workspace=packages/frontend

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/frontend/public packages/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/static packages/frontend/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/frontend/server.js"]
