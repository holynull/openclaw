# 部署第二套 OpenClaw 实例 - 快速指南

> 📢 **重要更新**：现在支持在同一个 `docker-compose.yml` 文件中管理多个实例！  
> 详细文档：[单一 Compose 文件多实例指南](docs/SINGLE_COMPOSE_MULTI_INSTANCE.md)

## 🚀 快速开始（推荐方式）

使用同一个 `docker-compose.yml` 文件部署第二套 OpenClaw 实例。

### 📋 前置条件

- 已部署第一套 OpenClaw 实例
- Docker 和 docker-compose 已安装
- 有 SSH 访问服务器的权限

## ⚡ 三步部署

### 1. 配置环境变量

SSH 到服务器并在 `.env` 文件中添加第二套实例配置：

```bash
ssh openclaw
cd ~/github.com/holynull/openclaw
nano .env  # 或使用 vim
```

**在 `.env` 文件末尾添加：**

```bash
# ============ 第二套实例配置 ============
OPENCLAW_CONFIG_DIR_2=~/.openclaw2
OPENCLAW_WORKSPACE_DIR_2=~/.openclaw2/workspace
OPENCLAW_GATEWAY_PORT_2=28789
OPENCLAW_BRIDGE_PORT_2=28790
OPENCLAW_GATEWAY_TOKEN_2=your-second-random-token

# 可选：使用不同的 Telegram Bot 或飞书应用
# TELEGRAM_BOT_TOKEN_2=your-second-bot-token
# FEISHU_APP_ID_2=cli_xxx
# FEISHU_APP_SECRET_2=xxx
```

> 💡 **生成随机 token**: `openssl rand -hex 32`

### 2. 创建数据目录

```bash
mkdir -p ~/.openclaw2/workspace
```

### 3. 启动第二套实例

```bash
# 只启动第二套实例
docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2

# 或同时启动两套实例
docker-compose --profile second-instance up -d
```

## ✅ 验证部署

````bash
# 1. 检查容器状态
docker ps | grep openclaw

# 应该看到 4 个容器：
# - openclaw-gateway   (端口 18789)
# - openclaw-cli
# - openclaw-gateway-2 (端口 28789)
# - openclaw-cli-2

# 2. 测试 Gateway 健康检查
curl http://localhost:28789/healthz

# 3. 查看日志
docker-compose -f docker-compose.openclaw2.yml logs -f openclaw-gateway-2
```bash
# 1. 检查容器状态
docker ps | grep openclaw

# 应该看到 4 个容器：
# - openclaw-gateway   (端口 18789)
# - openclaw-cli
# - openclaw-gateway-2 (端口 28789)
# - openclaw-cli-2

# 2. 测试 Gateway 健康检查
curl http://localhost:28789/healthz

# 3. 查看日志
docker-compose logs -f openclaw-gateway-2
````

## 📊 对比两套实例

| 项目         | 第一套实例                         | 第二套实例                             |
| ------------ | ---------------------------------- | -------------------------------------- |
| 配置文件     | `docker-compose.yml`               | `docker-compose.yml` (同一个文件)      |
| Profile      | (默认)                             | `second-instance`                      |
| 环境变量     | `.env` (上半部分)                  | `.env` (下半部分)                      |
| Gateway 端口 | 18789                              | 28789                                  |
| Bridge 端口  | 18790                              | 28790                                  |
| 数据目录     | `$OPENCLAW_CONFIG_DIR`             | `$OPENCLAW_CONFIG_DIR_2`               |
| 容器名       | `openclaw-gateway`, `openclaw-cli` | `openclaw-gateway-2`, `openclaw-cli-2` |

## 🔧 常用管理命令

```bash
# 启动第一套实例
docker-compose up -d openclaw-gateway openclaw-cli

# 启动第二套实例
docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2

# 同时启动两套实例
docker-compose --profile second-instance up -d

# 停止第二套实例
docker-compose stop openclaw-gateway-2 openclaw-cli-2

# 停止所有实例
docker-compose --profile second-instance down

# 重启第二套实例
docker-compose restart openclaw-gateway-2 openclaw-cli-2

# 查看日志
docker-compose logs -f openclaw-gateway-2
docker-compose logs -f openclaw-cli-2

# 进入 CLI 容器
docker exec -it openclaw-cli-2 bash
```

## 🛠️ 故障排查

**端口已被占用：**

```bash
# 检查端口占用
sudo netstat -tlnp | grep 28789
sudo lsof -i :28789

# 修改 .env 中的端口号
OPENCLAW_GATEWAY_PORT_2=38789
OPENCLAW_BRIDGE_PORT_2=38790
```

**权限问题：**

```bash
# 修复数据目录权限
sudo chown -R $(id -u):$(id -g) ~/.openclaw2
chmod -R 755 ~/.openclaw2
```

**Profile 不生效：**

```bash
# 确保使用了 --profile 参数
docker-compose --profile second-instance up -d
```

**容器无法启动：**

```bash
# 查看详细错误
docker-compose logs openclaw-gateway-2

# 检查配置是否正确
docker-compose config

# 重新构建镜像
docker build -t openclaw:local .
```

## 🌐 外部访问配置

如果需要从外网访问第二套 Gateway：

**开放防火墙端口：**

```bash
# Ubuntu/Debian
sudo ufw allow 28789/tcp
sudo ufw allow 28790/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=28789/tcp
sudo firewall-cmd --permanent --add-port=28790/tcp
sudo firewall-cmd --reload
```

**配置反向代理（Nginx 示例）：**

```nginx
server {
    listen 443 ssl;
    server_name openclaw2.example.com;

    location / {
        proxy_pass http://localhost:28789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🧹 清理第二套实例

如果不再需要第二套实例：

```bash
# 停止并删除容器
docker-compose stop openclaw-gateway-2 openclaw-cli-2
docker rm openclaw-gateway-2 openclaw-cli-2

# 删除数据（谨慎操作！）
rm -rf ~/.openclaw2

# 从 .env 中删除第二套实例的配置
nano .env  # 删除 OPENCLAW_*_2 相关行
```

## 📚 相关文档

- **[单一 Compose 文件多实例指南](docs/SINGLE_COMPOSE_MULTI_INSTANCE.md)** - 详细说明和高级用法
- [多实例部署文档](docs/MULTI_INSTANCE_DEPLOYMENT.md) - 旧版独立配置方式
- [Docker Compose Profiles](https://docs.docker.com/compose/profiles/) - 官方文档

---

## 💡 使用技巧

### 别名简化命令

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# OpenClaw 快捷命令
alias oc1-up='docker-compose up -d openclaw-gateway openclaw-cli'
alias oc2-up='docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2'
alias oc-up='docker-compose --profile second-instance up -d'
alias oc-down='docker-compose --profile second-instance down'
alias oc-ps='docker ps | grep openclaw'
alias oc1-cli='docker exec -it openclaw-cli bash'
alias oc2-cli='docker exec -it openclaw-cli-2 bash'
```

### 监控资源使用

```bash
# 查看容器资源使用情况
docker stats openclaw-gateway openclaw-gateway-2

# 持续监控
watch -n 2 'docker stats --no-stream openclaw-gateway openclaw-gateway-2'
```

### 分别配置 Bot

两套实例可以使用不同的 Telegram Bot：

```bash
# .env 文件中
TELEGRAM_BOT_TOKEN=123456:ABCDEF      # 第一套
TELEGRAM_BOT_TOKEN_2=789012:GHIJKL    # 第二套
```

---

## ❓ 常见问题

**Q: 为什么要用 `--profile second-instance`？**  
A: Profile 是 Docker Compose 的标签功能，让你选择性启动服务。不加 profile 时默认只启动第一套实例。

**Q: 两套实例可以共享 API Keys 吗？**  
A: 可以。默认两套实例共享 `.env` 中的所有 API Keys。

**Q: 如何只启动第二套实例，不启动第一套？**  
A: 使用 `docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2`

**Q: 可以添加第三套实例吗？**  
A: 可以。在 `docker-compose.yml` 中添加 `openclaw-gateway-3` 和 `openclaw-cli-3` 服务，使用不同的 profile 和端口。

**Q: 旧版的 `docker-compose.openclaw2.yml` 还能用吗？**  
A: 可以，但推荐迁移到新的单文件方式，更方便管理。

---

## 🔄 从旧版配置迁移

如果之前使用了独立的 `docker-compose.openclaw2.yml`：

```bash
# 1. 停止旧配置的容器
docker-compose -f docker-compose.openclaw2.yml down

# 2. 将 .env.openclaw2 的内容追加到 .env
cat .env.openclaw2 >> .env

# 3. 使用新方式启动
docker-compose --profile second-instance up -d

# 4. 验证运行正常后可删除旧文件
rm docker-compose.openclaw2.yml .env.openclaw2
```

---

**需要更多帮助？** 查看 [docs/SINGLE_COMPOSE_MULTI_INSTANCE.md](docs/SINGLE_COMPOSE_MULTI_INSTANCE.md) 获取完整文档和高级用法！
