FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-contracts/package.json packages/shared-contracts/

RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prod=false

COPY apps/backend ./apps/backend
COPY packages/shared-contracts ./packages/shared-contracts

WORKDIR /app/apps/backend
RUN pnpm build

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
