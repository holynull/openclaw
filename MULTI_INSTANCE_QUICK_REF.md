# OpenClaw 多实例部署 - 快速参考

## 🎯 在同一个 docker-compose.yml 中部署多个实例

### 最简单的三步部署：

#### 1️⃣ 编辑 `.env` 文件

```bash
# 在现有配置后添加：
OPENCLAW_CONFIG_DIR_2=~/.openclaw2
OPENCLAW_WORKSPACE_DIR_2=~/.openclaw2/workspace
OPENCLAW_GATEWAY_PORT_2=28789
OPENCLAW_BRIDGE_PORT_2=28790
OPENCLAW_GATEWAY_TOKEN_2=$(openssl rand -hex 32)

# 如果需要使用不同的 Telegram Bot 或飞书应用：
# TELEGRAM_BOT_TOKEN_2=your-second-bot-token
# FEISHU_APP_ID_2=cli_xxx
# FEISHU_APP_SECRET_2=xxx
```

#### 2️⃣ 创建数据目录

```bash
mkdir -p ~/.openclaw2/workspace
```

#### 3️⃣ 启动第二套实例

```bash
docker-compose --profile second-instance up -d
```

✅ 完成！

---

## 📋 常用命令速查

```bash
# 只启动第一套实例（默认）
docker-compose up -d

# 只启动第二套实例
docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2

# 同时启动两套实例
docker-compose --profile second-instance up -d

# 停止所有实例
docker-compose --profile second-instance down

# 查看状态
docker ps | grep openclaw

# 查看日志
docker-compose logs -f openclaw-gateway-2

# 进入 CLI
docker exec -it openclaw-cli-2 bash

# 健康检查
curl http://localhost:18789/healthz  # 第一套
curl http://localhost:28789/healthz  # 第二套
```

---

## 📊 实例对比

| 服务             | 第一套                 | 第二套                                           |
| ---------------- | ---------------------- | ------------------------------------------------ |
| **Gateway 端口** | 18789                  | 28789                                            |
| **Bridge 端口**  | 18790                  | 28790                                            |
| **数据目录**     | `~/.openclaw`          | `~/.openclaw2`                                   |
| **容器名**       | `openclaw-gateway`     | `openclaw-gateway-2`                             |
| **启动命令**     | `docker-compose up -d` | `docker-compose --profile second-instance up -d` |

---

## 🔗 详细文档

- **[快速部署指南](DEPLOY_SECOND_INSTANCE.md)** - 完整部署步骤
- **[单一 Compose 使用文档](docs/SINGLE_COMPOSE_MULTI_INSTANCE.md)** - 高级用法和技巧
- **[多实例部署文档](docs/MULTI_INSTANCE_DEPLOYMENT.md)** - 旧版独立配置方式

---

## ⚡ 使用 Shell 别名（可选）

添加到 `~/.bashrc` 或 `~/.zshrc`：

```bash
alias oc1-up='docker-compose up -d openclaw-gateway openclaw-cli'
alias oc2-up='docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2'
alias oc-up='docker-compose --profile second-instance up -d'
alias oc-down='docker-compose --profile second-instance down'
alias oc-ps='docker ps | grep openclaw'
```

然后：

```bash
source ~/.bashrc  # 或 source ~/.zshrc
oc2-up  # 启动第二套实例
```

---

## 🛠️ 故障排查

| 问题           | 解决方案                                             |
| -------------- | ---------------------------------------------------- |
| 端口被占用     | `sudo lsof -i :28789` 检查占用，修改 `.env` 中的端口 |
| Profile 不生效 | 确保使用 `--profile second-instance` 参数            |
| 权限错误       | `sudo chown -R $(id -u):$(id -g) ~/.openclaw2`       |
| 容器冲突       | `docker rm -f openclaw-gateway-2 openclaw-cli-2`     |

---

**需要帮助？** 查看详细文档或运行 `docker-compose config` 检查配置。
