FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared-contracts/package.json packages/shared-contracts/

RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prod=false

COPY apps/frontend ./apps/frontend
COPY packages/shared-contracts ./packages/shared-contracts

WORKDIR /app/apps/frontend
RUN pnpm build

FROM nginx:alpine

COPY --from=builder /app/apps/frontend/dist/SoftmakingFrontEndArchetype/browser /usr/share/nginx/html

RUN printf '%s\n' \
    'server {' \
    '  listen 80;' \
    '  location /api/ {' \
    '    proxy_pass http://backend:3000/;' \
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
