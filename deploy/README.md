# Knowledge Hub 部署

## 首次部署

```bash
# 1. 配置 SSH 免密
ssh-copy-id root@101.43.44.95

# 2. 创建并编辑配置
cp deploy/.env.example deploy/.env
vim deploy/.env

# 3. 执行部署
./deploy/deploy.sh
```

## 日常更新

改完代码后重新运行 `./deploy/deploy.sh`，脚本会自动生成新的 `IMAGE_TAG` 并重建应用镜像。

## 访问地址

| 服务 | 地址 |
|---|---|
| 前端 | http://101.43.44.95:5175 |
| API（通过 NGINX 反代） | http://101.43.44.95:5175/api/ |
| API（公网直连） | http://101.43.44.95:3001/ |
| RabbitMQ 管理 | SSH 隧道 `127.0.0.1:15672` |
| ES | SSH 隧道 `127.0.0.1:9201` |
| Neo4j | SSH 隧道 `127.0.0.1:7474` |
| RustFS | SSH 隧道 `127.0.0.1:9000`（API）/ `9001`（控制台） |

## SSH 隧道示例

```bash
# 打开多端口隧道
ssh -N \
  -L 9201:127.0.0.1:9201 \
  -L 15672:127.0.0.1:15672 \
  -L 7474:127.0.0.1:7474 \
  -L 9000:127.0.0.1:9000 \
  -L 9001:127.0.0.1:9001 \
  root@101.43.44.95
```

## 测试账号

| 用户名 | 密码 | 角色 |
|---|---|---|
| admin | 123456 | 管理员 |
| reviewer | 123456 | 审核员 |
| user | 123456 | 普通用户 |

> **⚠️ 生产环境请部署后立即修改默认密码。**

## 日志与回滚

```bash
# 查看后端日志
ssh root@101.43.44.95 "cd /opt/knowledge-hub && docker compose -f docker-compose.prod.yml logs -f backend"

# 查看所有容器状态
ssh root@101.43.44.95 "cd /opt/knowledge-hub && docker compose -f docker-compose.prod.yml ps"

# 回滚到指定版本
ssh root@101.43.44.95 "cd /opt/knowledge-hub && IMAGE_TAG=<旧标签> docker compose -f docker-compose.prod.yml up -d"
```
