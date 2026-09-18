# 仓库协作指南

> 本文件为面向 AI 编码助手（Claude Code / Codex 等）的项目说明，`CLAUDE.md` 与 `AGENTS.md` 内容保持同步，修改其一时请一并更新另一份。

## 项目概览

本仓库是 Knowledge Hub 的 pnpm + Turbo monorepo，包含一个 NestJS 后端与**两个功能等价、并行演进**的前端应用：

- **`backend/`**（`knowledge-hub-backend`）——NestJS 11 API 服务，端口 `3000`。
- **`frontend/react-app/`**（`knowledge-hub-react-app`）——React 管理台（Vite + React 19 + Ant Design 6 + ECharts），端口 `5173`。
- **`frontend/vue-app/`**（`knowledge-hub-vue-app`）——Vue 管理台（基于 vue-vben-admin 5.x + Element Plus + Tailwind CSS 4），端口 `5174`。当前阶段一已完成：登录、布局、路由权限、请求层、首页大盘、文档列表；其余页面为占位，按 React 端逐页复刻。
- **`frontend/packages/`、`frontend/internal/`**——从 vue-vben-admin vendor 进来的框架包（`@vben/*`、`@vben-core/*`）与构建配置，原则上不做业务改动（见「vendor 边界」）。

## 目录结构

- `backend/src/`：按模块划分（auth、user、document、search、ai、graph、team、storage、mq 等）。
- `frontend/react-app/src/`：`pages/`（页面）、`components/`、`layouts/`、`api/`（接口层）、`utils.ts`。
- `frontend/vue-app/src/`：`views/`（页面目录内 `index.vue` + 私有组件放 `modules/`）、`components/`（共享组件，kebab-case 目录 + `index.ts` 导出）、`layouts/`、`api/`、`router/`、`store/`、`adapter/`、`locales/`；应用内以 `#/*` 别名指向 `./src/*`。
- `deploy/`：Docker 构建与一键部署（`deploy.sh`、`docker-compose.prod.yml`、各 Dockerfile、`nginx.conf`）。
- 单元测试就近放置于 `__tests__/` 目录。

## 构建、测试与开发命令

强制使用 pnpm 10（`packageManager: pnpm@10.33.4`），Node `>=22.15.1`。本机全局 pnpm 为 9 时，用 `npm exec --yes --package=pnpm@10.33.4 -- pnpm <args>` 运行，勿改动全局环境。

- `pnpm install`：安装全部工作区依赖（postinstall 会执行框架包的 stub 构建）。
- `pnpm dev:backend` / `pnpm dev:react` / `pnpm dev:vue`：分别启动后端 / React 前端 / Vue 前端。
- `pnpm build`：Turbo 构建三个应用；`build:backend` / `build:react` / `build:vue` 单独构建。
- `pnpm --filter knowledge-hub-vue-app test`：Vitest 单测（happy-dom）；`pnpm --filter knowledge-hub-vue-app typecheck`：vue-tsc。
- `pnpm lint`：Turbo 跑各包 lint（react-app 用 oxlint）。
- 本地依赖容器：`docker compose -f backend/docker-compose.yml up -d`（Postgres/Mongo/Redis/RabbitMQ/ES/Neo4j 等），随后 `pnpm dev:backend`。

## 后端接口契约（两个前端共同遵守）

- **无全局前缀、无响应包装**：端点直接是 `/auth/login`、`/documents` 等；响应是裸 JSON 对象/数组，靠 HTTP 状态码表意。vue-app 请求层因此用 `responseReturn: 'body'` 且**不注册** `defaultResponseInterceptor`（见 `frontend/vue-app/src/api/request.ts`）。
- **鉴权**：`Authorization: Bearer <accessToken>`；401 时前端用 refreshToken 调 `POST /auth/refresh` 后重放。登录/刷新返回 `{ accessToken, refreshToken, tokenType, expiresIn, userInfo }`。
- **代理**：开发期 Vite 把 `/api` 代理到 `http://localhost:3000` 并剥离前缀（后端未开 CORS，禁止直连 3000）；生产由 NGINX 同源反代（`deploy/nginx.conf`）。
- **流式问答**：`POST /ai/chat/stream` 是 Vercel AI SDK 的 UI Message Stream 协议（part 类型：`data-session`/`data-status`/`data-retrieve`/`data-sources`/`reasoning`/tool `web_search` 等）；React 端用 `@ai-sdk/react`，Vue 端用 `@ai-sdk/vue`，不要手写 SSE 解析。
- **权限模型**：权限码来自 `/auth/me`（roles + permissions）。后端对 `ROLE_ADMIN` 展开的管理权限**不含菜单码**（dashboard/profile），因此前端保留「管理员短路放行」判断（react-app `src/utils.ts` 的 `can()`；vue-app `src/utils/access.ts`），两个前端语义必须一致。
- **并行演进**：接口变更需同时更新两个前端；vue-app 的 `src/api/core/` 每个文件头注明对照的 react-app 文件路径，改动时同步维护。

## 代码风格与命名约定

- 保持改动最小化（surgical），匹配现有文件风格，不顺手改动无关代码；提交前跑改动包的 lint / typecheck。
- vue-app 优先 Vue 3 Composition API（`<script setup>`）与 TypeScript，遵循 vben 约定：业务页面目录、组件文件、普通 TS 文件用 kebab-case；页面入口 `index.vue`；页面私有组件放同级 `modules/`；跨页共享组件放 `src/components/<kebab-case>/`，经 `index.ts` 导出，调用方从目录导入（不建 `components/index.ts` 根聚合出口）；composable 用 `use-*.ts` 导出 `useXxx`。
- vue-app 样式：布局、间距、排版、颜色优先 Tailwind 并选用语义 token（避免滥用任意值）；组件语义结构、伪元素、第三方覆盖用 BEM 放 `<style scoped>`；动态 class 必须是可静态扫描的完整类名，禁止运行时拼接 Tailwind 类名。
- react-app 已有约定：`pages/` 平铺 + `kh-*` CSS 类前缀（`src/index.css`），保持不变，不做迁移重构。
- 注释只针对非显而易见的业务逻辑、安全敏感代码、性能取舍或公共 API，优先中文注释、技术术语可保留英文。

### vendor 边界

`frontend/packages/` 与 `frontend/internal/` 是 vue-vben-admin 5.7 的框架代码。已做的本地化适配（除此之外不要改动）：

- `internal/tailwind-config/src/theme.css`：`@source` 扫描路径指向 `react-app/` 与 `vue-app/`。
- `internal/vite-config/src/config/application.ts`：全局 SCSS 注入目录改为大仓根下的 `frontend/<app>`。
- `packages/@core/base/design/src/design-tokens/default.css`：`--primary` 已调整为 Knowledge Hub 主题蓝。

## 测试规范

- Vitest 配置见 `frontend/vue-app/vitest.config.ts`；测试文件命名 `*.test.ts`，就近置于 `__tests__/`。
- 需要测试：权限判定等纯函数、api 层参数映射与异常处理（mock 网络）、store 行为、缺陷修复回归。无需测试：纯样式、静态文案、第三方库行为、不为覆盖率数字造用例。
- 端到端冒烟用 Python Playwright 临时脚本，覆盖登录、权限可见性（admin/user/reviewer 三账号菜单差异）、核心页面渲染；依赖后端与依赖容器已在运行。
- 默认先跑聚焦测试；涉及跨应用契约或高风险流程时再跑 `pnpm test`。

### 本地测试账号

- `admin` / `123456`（管理员）、`reviewer` / `123456`（审核员）、`user` / `123456`（普通用户）。
- 仅用于本地开发与测试环境；生产部署后须立即修改默认密码。

## 提交与 PR 规范

- 提交信息遵循 Conventional Commits，仅使用「标准类型 + 描述」：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`、`types`。
- 未经用户明确要求，**不执行 `git push`**，仅进行本地 Git 操作。
- 遇到合并冲突时暂停操作并询问用户确认。

## 安全与配置提示

- 严禁提交任何密钥。`backend/.env`、`frontend/*/.env*`（`!.env.example`）、`deploy/.env` 均被 Git 忽略，只保留在本地。
- `VITE_APP_STORE_SECURE_KEY`、`JWT_SECRET` 等敏感配置在部署环境必须替换，勿使用占位默认值。

## 部署

- 一键部署：`cp deploy/.env.example deploy/.env && 编辑配置 && ./deploy/deploy.sh`（本机构建镜像 → SSH 传输 → Compose 启动）。
- `deploy/frontend.Dockerfile` 通过 `FRONTEND_APP` 构建参数选择产物（`react-app` 或 `vue-app`），当前默认 `react-app`；切换为 Vue 端需显式传参或在 `deploy/.env` 配置 `FRONTEND_APP=vue-app`。
- 回滚：`ssh <host> 'cd /opt/knowledge-hub && IMAGE_TAG=<旧标签> docker compose -f docker-compose.prod.yml up -d'`。
