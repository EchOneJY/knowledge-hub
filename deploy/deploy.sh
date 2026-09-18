#!/usr/bin/env bash
#
# Knowledge Hub 一键部署脚本
# 本机构建 Docker 镜像 → SSH 传输到服务器 → Compose 启动
#
# 用法:
#   cp deploy/.env.example deploy/.env && 编辑配置
#   ./deploy/deploy.sh
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

# --- 构建 ES 镜像 ---
echo "==> 构建 Elasticsearch 镜像 (knowledge-hub-es:latest)"
docker build --platform "$PLATFORM" --provenance=false --sbom=false \
  -f "$ES_DOCKERFILE" -t knowledge-hub-es:latest "$REPO_ROOT/deploy"

# --- 构建后端镜像 ---
echo "==> 构建后端镜像 (knowledge-hub-backend:$IMAGE_TAG)"
docker build --platform "$PLATFORM" --provenance=false --sbom=false \
  -f "$BACKEND_DOCKERFILE" \
  -t "knowledge-hub-backend:$IMAGE_TAG" -t "knowledge-hub-backend:latest" \
  "$REPO_ROOT"

# --- 构建前端镜像 ---
# FRONTEND_APP 选择构建 react-app / vue-app（可在 deploy/.env 配置，默认 react-app）
FRONTEND_APP=${FRONTEND_APP:-$(env_get FRONTEND_APP react-app)}
echo "==> 构建前端镜像 (knowledge-hub-frontend:$IMAGE_TAG  app=$FRONTEND_APP)"
docker build --platform "$PLATFORM" --provenance=false --sbom=false \
  -f "$FRONTEND_DOCKERFILE" \
  --build-arg FRONTEND_APP="$FRONTEND_APP" \
  -t "knowledge-hub-frontend:$IMAGE_TAG" -t "knowledge-hub-frontend:latest" \
  "$REPO_ROOT"

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
IMAGES=(
  "knowledge-hub-es:latest"
  "knowledge-hub-backend:$IMAGE_TAG"
  "knowledge-hub-backend:latest"
  "knowledge-hub-frontend:$IMAGE_TAG"
  "knowledge-hub-frontend:latest"
)

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
echo "==> 启动容器"
ssh "$SSH_TARGET" "cd '$DEPLOY_DIR' && IMAGE_TAG='$IMAGE_TAG' docker compose -f docker-compose.prod.yml up -d"

# --- 等待健康检查 ---
echo "==> 等待服务就绪..."
ready=false
for i in $(seq 1 90); do
  status=$(ssh "$SSH_TARGET" "cd '$DEPLOY_DIR' && ids=\$(docker compose -f docker-compose.prod.yml ps -q); total=\$(printf '%s' \$ids | wc -w | tr -d ' '); healthy=\$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' \$ids 2>/dev/null | grep -c '^healthy$' || true); echo \"\${healthy}/\${total}\"" 2>/dev/null || echo '0/0')
  if [[ "$status" == "9/9" ]]; then
    ready=true
    echo "==> 所有 9 个容器已健康"
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
echo "==> 部署完成"
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
echo "    ssh $SSH_TARGET 'cd $DEPLOY_DIR && IMAGE_TAG=<旧标签> docker compose -f docker-compose.prod.yml up -d'"
