# 前端多阶段构建：当前应用位于 frontend/react-app，由 NGINX 托管并反代 /api
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# react-app 当前是独立包；目录重构后根 lockfile 暂无对应 importer。
# 先按 package.json 安装依赖，构建环境内会生成临时 lockfile，不修改仓库。
COPY frontend/react-app/package.json ./
RUN pnpm install --no-frozen-lockfile

COPY frontend/react-app .

# Vite 在构建时内联环境变量；/api 走同源 NGINX 反代，避免跨域
ENV VITE_API_BASE=/api
RUN pnpm build

FROM nginx:1.27-alpine AS production

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
