FROM node:24.15.0-alpine AS builder

WORKDIR /app

RUN corepack enable && \
    corepack prepare pnpm@10.16.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared-contracts/package.json packages/shared-contracts/

RUN pnpm install --frozen-lockfile --prod=false

COPY apps/frontend ./apps/frontend
COPY packages/shared-contracts ./packages/shared-contracts

RUN pnpm --filter @kyrae/shared-contracts build && \
    pnpm --filter kyrae-frontend build

FROM nginx:alpine

COPY --from=builder /app/apps/frontend/dist/KyraeFrontend/browser /usr/share/nginx/html

RUN printf '%s\n' \
    'server {' \
    '  listen 80;' \
    '  location /api/ {' \
    '    proxy_pass http://kyrae-backend:3000/;' \
    '    proxy_set_header Host $host;' \
    '    proxy_set_header X-Real-IP $remote_addr;' \
    '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
    '    proxy_set_header X-Forwarded-Proto $scheme;' \
    '  }' \
    '  location / {' \
    '    root /usr/share/nginx/html;' \
    '    try_files $uri $uri/ /index.html;' \
    '  }' \
    '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
