FROM node:24.15.0-alpine AS builder

WORKDIR /app

RUN corepack enable && \
    corepack prepare pnpm@10.16.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-contracts/package.json packages/shared-contracts/

RUN pnpm install --frozen-lockfile --prod=false

COPY apps/backend ./apps/backend
COPY packages/shared-contracts ./packages/shared-contracts

RUN pnpm --filter @kyrae/shared-contracts build && \
    pnpm --filter kyrae-backend build && \
    pnpm --filter kyrae-backend --prod deploy --legacy /prod/backend && \
    cp -R /app/apps/backend/dist /prod/backend/dist && \
    cp -R /app/packages/shared-contracts/dist \
      /prod/backend/node_modules/@kyrae/shared-contracts/dist && \
    test -f /prod/backend/dist/main.js && \
    test -f /prod/backend/node_modules/@kyrae/shared-contracts/dist/index.js

FROM node:24.15.0-alpine AS runtime

WORKDIR /app

COPY --from=builder /prod/backend ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
