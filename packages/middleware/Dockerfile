FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/middleware/package.json packages/middleware/
RUN npm install --workspace=packages/middleware

COPY tsconfig.base.json ./
COPY packages/middleware/ packages/middleware/
RUN npm run build --workspace=packages/middleware

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/middleware/dist packages/middleware/dist
COPY --from=builder /app/packages/middleware/package.json packages/middleware/
COPY --from=builder /app/packages/middleware/prisma packages/middleware/prisma
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3001

CMD ["node", "packages/middleware/dist/index.js"]
