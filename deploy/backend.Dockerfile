# 后端多阶段构建：pnpm 构建 NestJS，仅保留运行时依赖和 dist 产物
FROM node:22-alpine AS build

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

# 先复制依赖清单，最大化利用 Docker layer cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

# filter 匹配的是包名（package.json 的 name），不是目录名；
# ignore-scripts 跳过根 postinstall（stub 只服务前端包，后端镜像不需要）
RUN pnpm install --filter knowledge-hub-backend... --frozen-lockfile --ignore-scripts

COPY backend backend

RUN pnpm --filter knowledge-hub-backend build \
  && pnpm deploy --filter knowledge-hub-backend --prod /tmp/backend-deploy

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=node:node /tmp/backend-deploy/node_modules ./node_modules
COPY --from=build --chown=node:node /tmp/backend-deploy/package.json ./package.json
COPY --from=build --chown=node:node /workspace/backend/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
