# Knowledge Hub

Knowledge Hub 的 pnpm monorepo，包含 NestJS 后端与 Vite + React 前端。

## 目录结构

```text
backend/   NestJS API 服务
frontend/  React 管理台
```

## 本地启动

```bash
pnpm install
docker compose -f backend/docker-compose.yml up -d
pnpm dev:backend
pnpm dev:frontend
```

后端默认监听 `http://localhost:3000`，前端默认监听 `http://localhost:5173`。前端开发服务器会将 `/api` 代理到后端。

## 常用命令

```bash
pnpm build
pnpm test
pnpm lint
```

## 环境变量

`backend/.env` 与 `frontend/.env` 仅用于本机运行，均被 Git 忽略，不应提交到仓库。
