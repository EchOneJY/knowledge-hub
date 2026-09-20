#!/usr/bin/env bash
#
# Knowledge Hub 一键部署脚本
# 本机构建 Docker 镜像 → SSH 传输到服务器 → Compose 启动
#
# 用法:
#   cp deploy/.env.example deploy/.env && 编辑配置
#   ./deploy/deploy.sh                       # 全量部署(ES + 后端 + 前端 + 依赖)
#   ./deploy/deploy.sh --only frontend       # 仅重建前端(不触碰后端/数据库)
#   ./deploy/deploy.sh --only backend        # 仅重建后端
#   ./deploy/deploy.sh --only frontend,backend  # 仅重建前后端
#
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE="$REPO_ROOT/deploy/.env"
COMPOSE_FILE="$REPO_ROOT/deploy/docker-compose.prod.yml"
ES_DOCKERFILE="$REPO_ROOT/deploy/es.Dockerfile"
BACKEND_DOCKERFILE="$REPO_ROOT/deploy/backend.Dockerfile"
FRONTEND_DOCKERFILE="$REPO_ROOT/deploy/frontend.Dockerfile"

if [[ ! -f $ENV_FILE ]]; then
  echo "错误: 找不到 deploy/.env，请先执行 cp deploy/.env.example deploy/.env 并填写配置" >&2
  exit 1
fi

env_get() {
  local key=$1 default=${2-} line
  line=$(grep -E "^[[:space:]]*${key}=" "$ENV_FILE" | tail -n 1 || true)
  if [[ -z $line ]]; then
    printf '%s' "$default"
    return
  fi
  line=${line#*=}
  line=${line%\"} && line=${line#\"}
  line=${line%\'} && line=${line#\'}
  printf '%s' "$line"
}

DEPLOY_HOST=${DEPLOY_HOST:-$(env_get DEPLOY_HOST)}
DEPLOY_USER=${DEPLOY_USER:-$(env_get DEPLOY_USER root)}
DEPLOY_DIR=${DEPLOY_DIR:-$(env_get DEPLOY_DIR /opt/knowledge-hub)}
IMAGE_TAG=${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}
SSH_TARGET="$DEPLOY_USER@$DEPLOY_HOST"

# --- 解析命令行参数 ---
# 默认全量部署;--only 仅部署指定应用,复用同套构建/传输/启动流程,不重建数据库等基础设施
ONLY_APPS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --only)
      [[ $# -ge 2 ]] || { echo "错误: --only 需要参数,如 --only frontend" >&2; exit 1; }
      IFS=',' read -r -a ONLY_APPS <<< "$2"; shift 2 ;;
    --only=*)
      IFS=',' read -r -a ONLY_APPS <<< "${1#*=}"; shift ;;
    -h | --help)
      echo "用法: $0 [--only frontend|backend|frontend,backend]"; exit 0 ;;
    *)
      echo "错误: 未知参数 $1(可用: --only frontend|backend)" >&2; exit 1 ;;
  esac
done

# ONLY_APPS 非空即为部分部署,并校验取值合法
PARTIAL=false
if [[ ${#ONLY_APPS[@]} -gt 0 ]]; then
  PARTIAL=true
  for app in "${ONLY_APPS[@]}"; do
    case $app in
      frontend | backend) ;;
      *) echo "错误: --only 仅支持 frontend / backend,收到: $app" >&2; exit 1 ;;
    esac
  done
fi

# want <app>: 全量部署时恒真;--only 模式下仅当 app 在待部署列表中才为真
want() {
  $PARTIAL || return 0
  local a
  for a in "${ONLY_APPS[@]}"; do [[ $a == "$1" ]] && return 0; done
  return 1
}

if [[ -z $DEPLOY_HOST ]]; then
  echo "错误: deploy/.env 里没有 DEPLOY_HOST" >&2
  exit 1
fi

# 检测 SSH 连通性
echo "==> 检测 SSH 连接 $SSH_TARGET"
ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_TARGET" 'echo SSH_OK' \
  || { echo "错误: 无法 SSH 连接 ${SSH_TARGET}，请先配置免密登录" >&2; exit 1; }

# 探测服务器架构
remote_arch=$(ssh "$SSH_TARGET" 'uname -m')
case $remote_arch in
  x86_64)   PLATFORM=linux/amd64 ;;
  aarch64|arm64) PLATFORM=linux/arm64 ;;
  *) echo "错误: 无法识别服务器架构 $remote_arch" >&2; exit 1 ;;
esac

echo "==> 目标 $SSH_TARGET:$DEPLOY_DIR  架构 $PLATFORM  标签 $IMAGE_TAG"

# --- 构建 ES 镜像（仅全量部署，属基础设施，--only 时跳过） ---
if ! $PARTIAL; then
  echo "==> 构建 Elasticsearch 镜像 (knowledge-hub-es:latest)"
  docker build --platform "$PLATFORM" --provenance=false --sbom=false \
    -f "$ES_DOCKERFILE" -t knowledge-hub-es:latest "$REPO_ROOT/deploy"
fi

# --- 构建后端镜像 ---
if want backend; then
  echo "==> 构建后端镜像 (knowledge-hub-backend:$IMAGE_TAG)"
  docker build --platform "$PLATFORM" --provenance=false --sbom=false \
    -f "$BACKEND_DOCKERFILE" \
    -t "knowledge-hub-backend:$IMAGE_TAG" -t "knowledge-hub-backend:latest" \
    "$REPO_ROOT"
fi

# --- 构建前端镜像 ---
if want frontend; then
  # FRONTEND_APP 选择构建 react-app / vue-app（可在 deploy/.env 配置，默认 react-app）
  FRONTEND_APP=${FRONTEND_APP:-$(env_get FRONTEND_APP react-app)}
  echo "==> 构建前端镜像 (knowledge-hub-frontend:$IMAGE_TAG  app=$FRONTEND_APP)"
  docker build --platform "$PLATFORM" --provenance=false --sbom=false \
    -f "$FRONTEND_DOCKERFILE" \
    --build-arg FRONTEND_APP="$FRONTEND_APP" \
    -t "knowledge-hub-frontend:$IMAGE_TAG" -t "knowledge-hub-frontend:latest" \
    "$REPO_ROOT"
fi

# --- 准备服务器目录 ---
echo "==> 准备服务器目录 $DEPLOY_DIR"
ssh "$SSH_TARGET" "mkdir -p '$DEPLOY_DIR' '$DEPLOY_DIR/init-scripts/postgresql' '$DEPLOY_DIR/init-scripts/mongodb'"

# --- 上传文件 ---
echo "==> 上传配置文件"
scp "$COMPOSE_FILE" "$SSH_TARGET:$DEPLOY_DIR/docker-compose.prod.yml"
scp "$ENV_FILE" "$SSH_TARGET:$DEPLOY_DIR/.env"
scp "$REPO_ROOT/backend/init-scripts/postgresql/init.sql" \
    "$SSH_TARGET:$DEPLOY_DIR/init-scripts/postgresql/init.sql"
scp "$REPO_ROOT/backend/init-scripts/mongodb/init.js" \
    "$SSH_TARGET:$DEPLOY_DIR/init-scripts/mongodb/init.js"

# --- 传输镜像 ---
echo "==> 传输镜像到服务器（首次约 2-3 GB，耐心等待）"
IMAGES=()
$PARTIAL || IMAGES+=("knowledge-hub-es:latest")
if want backend; then
  IMAGES+=("knowledge-hub-backend:$IMAGE_TAG" "knowledge-hub-backend:latest")
fi
if want frontend; then
  IMAGES+=("knowledge-hub-frontend:$IMAGE_TAG" "knowledge-hub-frontend:latest")
fi

# 检查服务器上是否已有这些镜像，跳过已有的基础镜像
existing=$(ssh "$SSH_TARGET" 'docker images --format "{{.Repository}}:{{.Tag}}"' 2>/dev/null || echo "")

save_list=()
for img in "${IMAGES[@]}"; do
  if ! echo "$existing" | grep -qF "$img"; then
    save_list+=("$img")
  else
    echo "    跳过已有镜像: $img"
  fi
done

if [[ ${#save_list[@]} -gt 0 ]]; then
  echo "    需要传输: ${save_list[*]}"
  docker save "${save_list[@]}" | gzip -1 | ssh "$SSH_TARGET" 'docker load'
fi

# --- 启动服务 ---
if $PARTIAL; then
  # 仅重建指定应用容器：--no-deps 不触碰数据库/ES 等依赖，--force-recreate 确保换用新镜像
  echo "==> 重建容器: ${ONLY_APPS[*]}（--no-deps，不触碰数据库等依赖）"
  ssh "$SSH_TARGET" "cd '$DEPLOY_DIR' && IMAGE_TAG='$IMAGE_TAG' docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate ${ONLY_APPS[*]}"
else
  echo "==> 启动容器"
  ssh "$SSH_TARGET" "cd '$DEPLOY_DIR' && IMAGE_TAG='$IMAGE_TAG' docker compose -f docker-compose.prod.yml up -d"
fi

# --- 等待健康检查 ---
# 部分部署仅检查目标服务；全量为空表示检查全部容器
HEALTH_SERVICES=""
$PARTIAL && HEALTH_SERVICES="${ONLY_APPS[*]}"
echo "==> 等待服务就绪..."
ready=false
for i in $(seq 1 90); do
  status=$(ssh "$SSH_TARGET" "cd '$DEPLOY_DIR' && ids=\$(docker compose -f docker-compose.prod.yml ps -q $HEALTH_SERVICES); total=\$(printf '%s\n' \"\$ids\" | grep -c .); healthy=\$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' \$ids 2>/dev/null | grep -c '^healthy$' || true); echo \"\${healthy}/\${total}\"" 2>/dev/null || echo '0/0')
  healthy_count=${status%/*}
  total_count=${status#*/}
  if [[ "$total_count" != 0 && "$healthy_count" == "$total_count" ]]; then
    ready=true
    echo "==> 所有 $total_count 个容器已健康"
    break
  fi
  echo "    等待中... ($i/90) 状态: $status"
  sleep 5
done

if [[ $ready != true ]]; then
  echo "错误: 服务在等待窗口内未全部健康，请查看服务器日志" >&2
  ssh "$SSH_TARGET" "cd '$DEPLOY_DIR' && docker compose -f docker-compose.prod.yml ps"
  exit 1
fi

# --- 验证 ---
frontend_port=$(env_get FRONTEND_PORT 5175)
api_port=$(env_get API_PORT 3001)
echo ""
if $PARTIAL; then
  echo "==> 部分部署完成（${ONLY_APPS[*]}）"
else
  echo "==> 部署完成"
fi
echo "    前端: http://$DEPLOY_HOST:$frontend_port"
echo "    API (通过 NGINX): http://$DEPLOY_HOST:$frontend_port/api/"
echo "    API (直连): http://$DEPLOY_HOST:$api_port/"
echo ""
echo "==> 容器状态:"
ssh "$SSH_TARGET" "cd '$DEPLOY_DIR' && docker compose -f docker-compose.prod.yml ps"
echo ""
echo "==> 日志查看:"
echo "    ssh $SSH_TARGET 'cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs -f backend'"
echo ""
echo "==> 回滚:"
echo "    全量: ssh $SSH_TARGET 'cd $DEPLOY_DIR && IMAGE_TAG=<旧标签> docker compose -f docker-compose.prod.yml up -d'"
echo "    单服务: ssh $SSH_TARGET 'cd $DEPLOY_DIR && IMAGE_TAG=<旧标签> docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend'  # 或 backend"
