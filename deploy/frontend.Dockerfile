# 前端多阶段构建：按 FRONTEND_APP 构建参数选择 react-app / vue-app，
# 由 NGINX 托管静态产物并反代 /api
ARG FRONTEND_APP=react-app

FROM node:22-alpine AS build

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

ARG FRONTEND_APP=react-app

# filter 匹配的是包名（package.json 的 name），不是目录名
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY frontend/react-app/package.json frontend/react-app/package.json
COPY frontend/vue-app/package.json frontend/vue-app/package.json
# 框架包与构建配置参与 workspace 解析与 postinstall stub
COPY frontend/internal frontend/internal
COPY frontend/packages frontend/packages

# 全 workspace 安装：框架包的依赖闭包互相交叉，按 filter 装会缺 node-utils 的
# devDeps；build 阶段的体积代价不影响最终 NGINX 镜像。postinstall 完成 stub。
RUN pnpm install --frozen-lockfile

COPY frontend/react-app frontend/react-app
COPY frontend/vue-app frontend/vue-app

# Vite 在构建时内联环境变量；/api 走同源 NGINX 反代，避免跨域
# （react-app 读 VITE_API_BASE，vue-app 读 VITE_GLOB_API_URL，取值一致）
ENV VITE_API_BASE=/api \
    VITE_GLOB_API_URL=/api

RUN pnpm --filter "knowledge-hub-${FRONTEND_APP}" build \
  && cp -r "/workspace/frontend/${FRONTEND_APP}/dist" /workspace/frontend-dist

FROM nginx:1.27-alpine AS production

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend-dist /usr/share/nginx/html

EXPOSE 80
