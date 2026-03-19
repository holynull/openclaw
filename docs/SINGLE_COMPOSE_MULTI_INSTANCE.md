# 在同一个 docker-compose.yml 中管理多个 OpenClaw 实例

## 📖 概述

从现在起，可以在同一个 `docker-compose.yml` 文件中管理第一套和第二套 OpenClaw 实例，使用 Docker Compose 的 **profiles** 功能来控制启动哪个或哪些实例。

## 🎯 服务列表

| 服务名               | Profile           | 端口        | 数据目录                 | 说明               |
| -------------------- | ----------------- | ----------- | ------------------------ | ------------------ |
| `openclaw-gateway`   | (默认)            | 18789/18790 | `$OPENCLAW_CONFIG_DIR`   | 第一套实例 Gateway |
| `openclaw-cli`       | (默认)            | -           | `$OPENCLAW_CONFIG_DIR`   | 第一套实例 CLI     |
| `openclaw-gateway-2` | `second-instance` | 28789/28790 | `$OPENCLAW_CONFIG_DIR_2` | 第二套实例 Gateway |
| `openclaw-cli-2`     | `second-instance` | -           | `$OPENCLAW_CONFIG_DIR_2` | 第二套实例 CLI     |
| `softhsm-service`    | (默认)            | 3000        | -                        | SoftHSM 服务       |

## ⚙️ 配置环境变量

编辑 `.env` 文件（从 `.env.example` 复制）：

```bash
# 第一套实例配置（原有配置）
OPENCLAW_CONFIG_DIR=~/.openclaw
OPENCLAW_WORKSPACE_DIR=~/.openclaw/workspace
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_BRIDGE_PORT=18790
OPENCLAW_GATEWAY_TOKEN=your-first-token

# 第二套实例配置（新增）
OPENCLAW_CONFIG_DIR_2=~/.openclaw2
OPENCLAW_WORKSPACE_DIR_2=~/.openclaw2/workspace
OPENCLAW_GATEWAY_PORT_2=28789
OPENCLAW_BRIDGE_PORT_2=28790
OPENCLAW_GATEWAY_TOKEN_2=your-second-token

# API Keys（两套实例共享，或分别配置）
OPENAI_API_KEY=sk-xxx
TELEGRAM_BOT_TOKEN=xxx
# 如果需要第二套实例使用不同的 Bot 或飞书应用：
TELEGRAM_BOT_TOKEN_2=yyy
FEISHU_APP_ID_2=cli_xxx
FEISHU_APP_SECRET_2=xxx
```

## 🚀 启动服务

### 只启动第一套实例（默认行为）

```bash
# 启动第一套实例
docker-compose up -d

# 或明确指定服务
docker-compose up -d openclaw-gateway openclaw-cli
```

### 只启动第二套实例

```bash
# 使用 profile 启动第二套实例
docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2
```

### 同时启动两套实例

```bash
# 方式 1: 使用 profile 启动所有服务
docker-compose --profile second-instance up -d

# 方式 2: 明确指定所有需要的服务
docker-compose up -d openclaw-gateway openclaw-cli openclaw-gateway-2 openclaw-cli-2
```

### 启动时包含 SoftHSM 服务

```bash
# 启动所有服务（包括两套 OpenClaw 和 SoftHSM）
docker-compose --profile second-instance up -d
```

## 🔧 管理命令

### 查看运行状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看特定实例状态
docker ps | grep openclaw
```

### 查看日志

```bash
# 第一套实例日志
docker-compose logs -f openclaw-gateway
docker-compose logs -f openclaw-cli

# 第二套实例日志
docker-compose logs -f openclaw-gateway-2
docker-compose logs -f openclaw-cli-2

# 查看所有服务日志
docker-compose logs -f
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 只停止第一套实例
docker-compose stop openclaw-gateway openclaw-cli

# 只停止第二套实例
docker-compose stop openclaw-gateway-2 openclaw-cli-2

# 停止并删除所有容器（包括使用 profile 启动的）
docker-compose --profile second-instance down
```

### 重启服务

```bash
# 重启第一套实例
docker-compose restart openclaw-gateway openclaw-cli

# 重启第二套实例
docker-compose restart openclaw-gateway-2 openclaw-cli-2

# 重启所有服务
docker-compose --profile second-instance restart
```

### 进入容器

```bash
# 进入第一套 CLI
docker exec -it openclaw-cli bash

# 进入第二套 CLI
docker exec -it openclaw-cli-2 bash
```

## ✅ 验证部署

### 检查端口监听

```bash
# 检查所有 OpenClaw 端口
sudo netstat -tlnp | grep -E '(18789|18790|28789|28790)'

# 或使用 lsof
sudo lsof -i :18789
sudo lsof -i :28789
```

### 健康检查

```bash
# 第一套实例
curl http://localhost:18789/healthz

# 第二套实例
curl http://localhost:28789/healthz
```

### 查看容器列表

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

应该看到类似输出：

```
NAMES                   STATUS          PORTS
openclaw-gateway        Up X minutes    0.0.0.0:18789->18789/tcp, 0.0.0.0:18790->18790/tcp
openclaw-cli            Up X minutes
openclaw-gateway-2      Up X minutes    0.0.0.0:28789->18789/tcp, 0.0.0.0:28790->18790/tcp
openclaw-cli-2          Up X minutes
```

## 📂 数据目录结构

```
~/.openclaw/               # 第一套实例数据
├── openclaw.json
├── workspace/
└── ...

~/.openclaw2/              # 第二套实例数据
├── openclaw.json
├── workspace/
└── ...
```

## 🔐 防火墙配置

如果需要从外部访问：

```bash
# Ubuntu/Debian
sudo ufw allow 18789/tcp  # 第一套 Gateway
sudo ufw allow 18790/tcp  # 第一套 Bridge
sudo ufw allow 28789/tcp  # 第二套 Gateway
sudo ufw allow 28790/tcp  # 第二套 Bridge

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=18789/tcp
sudo firewall-cmd --permanent --add-port=18790/tcp
sudo firewall-cmd --permanent --add-port=28789/tcp
sudo firewall-cmd --permanent --add-port=28790/tcp
sudo firewall-cmd --reload
```

## 🐛 故障排查

### 端口冲突

```bash
# 检查端口占用
sudo lsof -i :28789

# 如果需要更改端口，编辑 .env
OPENCLAW_GATEWAY_PORT_2=38789
OPENCLAW_BRIDGE_PORT_2=38790
```

### Profile 不生效

确保使用 `--profile second-instance` 参数：

```bash
# ❌ 错误 - 第二套实例不会启动
docker-compose up -d

# ✅ 正确 - 启动第二套实例
docker-compose --profile second-instance up -d
```

### 数据目录权限

```bash
# 创建数据目录
mkdir -p ~/.openclaw2/workspace

# 修复权限
sudo chown -R $(id -u):$(id -g) ~/.openclaw2
chmod -R 755 ~/.openclaw2
```

### 容器名冲突

如果看到 "container name already exists" 错误：

```bash
# 查看已存在的容器
docker ps -a | grep openclaw

# 删除旧容器
docker rm -f openclaw-gateway-2 openclaw-cli-2
```

## 💡 使用技巧

### 1. 选择性启动

只在需要时启动第二套实例，节省资源：

```bash
# 日常只运行第一套
docker-compose up -d openclaw-gateway openclaw-cli

# 需要测试时启动第二套
docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2
```

### 2. 使用别名简化命令

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# OpenClaw 第一套实例
alias oc1-up='docker-compose up -d openclaw-gateway openclaw-cli'
alias oc1-down='docker-compose stop openclaw-gateway openclaw-cli'
alias oc1-logs='docker-compose logs -f openclaw-gateway'
alias oc1-cli='docker exec -it openclaw-cli bash'

# OpenClaw 第二套实例
alias oc2-up='docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2'
alias oc2-down='docker-compose stop openclaw-gateway-2 openclaw-cli-2'
alias oc2-logs='docker-compose logs -f openclaw-gateway-2'
alias oc2-cli='docker exec -it openclaw-cli-2 bash'

# 所有实例
alias oc-up='docker-compose --profile second-instance up -d'
alias oc-down='docker-compose --profile second-instance down'
alias oc-ps='docker ps | grep openclaw'
```

### 3. 分别配置 Bot Token 和飞书应用

在 `.env` 中为两套实例配置不同的 Telegram Bot 或飞书应用：

```bash
# 第一套实例
TELEGRAM_BOT_TOKEN=123456:ABCDEF
FEISHU_APP_ID=cli_aaa
FEISHU_APP_SECRET=secret_aaa

# 第二套实例
TELEGRAM_BOT_TOKEN_2=789012:GHIJKL
FEISHU_APP_ID_2=cli_bbb
FEISHU_APP_SECRET_2=secret_bbb
```

这样两个实例可以使用不同的 Bot 和飞书应用，互不干扰。

### 4. 监控资源使用

```bash
# 查看容器资源使用情况
docker stats openclaw-gateway openclaw-gateway-2

# 持续监控
watch -n 2 'docker stats --no-stream openclaw-gateway openclaw-gateway-2'
```

## 🔄 从独立配置迁移

如果你之前使用了 `docker-compose.openclaw2.yml`：

```bash
# 1. 停止旧的第二套实例
docker-compose -f docker-compose.openclaw2.yml down

# 2. 合并环境变量到 .env
cat .env.openclaw2 >> .env

# 3. 使用新方式启动
docker-compose --profile second-instance up -d

# 4. 可选：删除旧配置文件
rm docker-compose.openclaw2.yml .env.openclaw2
```

## 📚 相关文档

- [多实例详细部署文档](docs/MULTI_INSTANCE_DEPLOYMENT.md)
- [Docker Compose Profiles 官方文档](https://docs.docker.com/compose/profiles/)
- [OpenClaw 配置参考](docs/configuration.md)

## ❓ 常见问题

**Q: 两套实例可以共享 API Keys 吗？**  
A: 可以。默认情况下两套实例共享 `.env` 中的所有 API Keys。

**Q: 如何为第二套实例使用不同的 OpenAI Key？**  
A: 需要在 docker-compose.yml 中单独配置 `openclaw-gateway-2` 的环境变量。

**Q: Profile 和明确指定服务名有什么区别？**  
A: Profile 是一组服务的标签，`--profile second-instance` 会自动包含所有带该 profile 的服务。

**Q: 启动所有服务会占用多少资源？**  
A: 取决于负载，空闲时每套实例约占用 200-500MB 内存。建议至少 2GB 可用内存。

**Q: 可以添加第三套、第四套实例吗？**  
A: 可以，在 docker-compose.yml 中继续添加 `openclaw-gateway-3`、`openclaw-cli-3` 等服务，使用不同的 profile 和端口。
