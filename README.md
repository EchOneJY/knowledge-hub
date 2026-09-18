# Knowledge Hub

Knowledge Hub 的 pnpm monorepo，包含 NestJS 后端与两个功能等价的 React / Vue 前端。

## 目录结构

```text
backend/               NestJS API 服务
frontend/react-app/    React 管理台（Vite + Ant Design 6）
frontend/vue-app/      Vue 管理台（vue-vben-admin 5.x + Element Plus）
frontend/packages/     vendor 的 @vben/* 框架包
frontend/internal/     vendor 的构建配置（vite-config、tailwind-config 等）
deploy/                Docker 构建与一键部署
```

## 本地启动

```bash
pnpm install
docker compose -f backend/docker-compose.yml up -d
pnpm dev:backend
pnpm dev:react    # http://localhost:5173
pnpm dev:vue      # http://localhost:5174
```

后端默认监听 `http://localhost:3000`。前端开发服务器将 `/api` 代理到后端（后端未开 CORS，请勿直连 3000）。

> 要求 pnpm 10（`packageManager` 已锁定）。本机全局为 pnpm 9 时可用
> `npm exec --yes --package=pnpm@10.33.4 -- pnpm <命令>` 运行，无需改动全局环境。

## 常用命令

```bash
pnpm build            # Turbo 构建三个应用
pnpm --filter knowledge-hub-vue-app test
pnpm lint
```

预置账号（本地）：`user` / `123456`（文档与检索），`admin` / `123456`（系统管理与审核），`reviewer` / `123456`（审核）。

## 功能对照

两个前端功能保持等价（vue-app 当前为阶段一：登录 / 布局 / 权限路由 / 首页大盘 / 文档列表，其余页面在逐步复刻中）：

- 登录 / 资料 / 改密
- 文档列表、新建、编辑、发布、归档、下架、删除、上传解析
- 全文搜索 `POST /search`
- RAG 问答 `POST /ai/chat`、流式 `POST /ai/chat/stream`、仅检索 `POST /rag/search`
- 图谱检索 / 实体 / 关系
- 用户、角色权限、团队、审核工作台

## 环境变量

`backend/.env` 与 `frontend/*/.env*` 仅用于本机运行，均被 Git 忽略，不应提交到仓库。

## 部署

见 `deploy/README.md`。`deploy/frontend.Dockerfile` 通过 `--build-arg FRONTEND_APP=react-app|vue-app` 选择构建哪个前端，默认 `react-app`。
