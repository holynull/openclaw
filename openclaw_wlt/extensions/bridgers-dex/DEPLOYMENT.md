# Bridgers DEX Extension - 部署指南

## 📋 文件清单

确认以下文件已创建：

```
openclaw_wlt/extensions/bridgers-dex/
├── package.json              ✓ NPM 配置，包含 openclaw.extensions
├── openclaw.plugin.json      ✓ OpenClaw 插件元数据
├── index.ts                  ✓ 主入口，注册 5 个工具
├── src/
│   └── api-client.ts        ✓ Bridgers API 客户端
└── README.md                ✓ 使用文档
```

## 🚀 本地部署步骤

### 1. 验证文件结构

```bash
ls -la /Users/zhangleping/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/
```

应该看到所有文件。

### 2. 安装依赖

```bash
cd /Users/zhangleping/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex
npm install
```

### 3. 验证 TypeScript 编译

```bash
# 在 openclaw_wlt 目录
cd /Users/zhangleping/github.com/holynull/openclaw/openclaw_wlt
npx tsc --noEmit extensions/bridgers-dex/index.ts
```

如果没有错误，说明代码正确。

## 🌐 服务器部署

### 同步到服务器

```bash
# 从本地同步整个 extension
rsync -avz \
  /Users/zhangleping/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/ \
  openclaw:~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/
```

### 在服务器上安装依赖

```bash
ssh openclaw "cd ~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex && npm install"
```

### 检查插件位置

OpenClaw 会从多个位置加载插件：

1. `~/.openclaw2/extensions/` (用户级)
2. 项目下的 `extensions/` (如果在项目工作目录)
3. `openclaw_wlt/extensions/` (自定义路径)

确保路径在 OpenClaw 的搜索范围内。

## ⚙️ 配置

### Agent 配置 (~/.openclaw2/config.json)

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["bridgers-dex"]
        }
      }
    ]
  },
  "plugins": {
    "entries": {
      "bridgers-dex": {
        "enabled": true,
        "config": {
          "sourceFlag": "widget",
          "sourceType": "H5",
          "equipmentNo": ""
        }
      }
    }
  }
}
```

### Docker Compose 配置

如果使用 Docker，确保 volume 挂载包含 extensions 目录：

```yaml
services:
  openclaw-gateway-2:
    volumes:
      - ~/.openclaw2:/home/node/.openclaw
      - ./openclaw_wlt:/app/openclaw_wlt # 确保包含 extensions
```

## ✅ 验证部署

### 1. 列出已安装插件

```bash
# 本地
openclaw plugins list

# 服务器
ssh openclaw "docker exec openclaw-openclaw-gateway-2 openclaw plugins list"
```

应该看到 `bridgers-dex` 在列表中。

### 2. 查看插件详情

```bash
# 本地
openclaw plugins info bridgers-dex

# 服务器
ssh openclaw "docker exec openclaw-openclaw-gateway-2 openclaw plugins info bridgers-dex"
```

应该显示：

- ID: bridgers-dex
- Name: Bridgers DEX
- Status: enabled
- Tools: 5 tools registered

### 3. 测试工具可用性

```bash
# 本地测试
openclaw agent --local --message "调用 bridgers_get_tokens 工具查询支持的代币"

# 服务器测试 (通过 Feishu)
openclaw message send \
  --target "feishu:ou_YOUR_USER_ID" \
  --message "查询 Bridgers 支持的代币列表" \
  --agent main
```

### 4. 检查 Gateway 日志

```bash
# 服务器
ssh openclaw "docker logs -f --tail 100 openclaw-openclaw-gateway-2 2>&1 | grep -i bridgers"
```

应该看到：

```
bridgers-dex: Registered 5 tools
```

## 🔧 故障排查

### 问题 1: 插件未列出

**检查**:

```bash
# 确认文件存在
ssh openclaw "ls -la ~/.openclaw2/extensions/bridgers-dex/"

# 或检查项目目录
ssh openclaw "ls -la ~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/"
```

**解决**:

- 确保 `openclaw.plugin.json` 存在且有效
- 确保 `package.json` 包含 `openclaw.extensions` 配置

### 问题 2: 工具不可用

**检查配置**:

```bash
ssh openclaw "cat ~/.openclaw2/config.json | grep -A 10 bridgers-dex"
```

**解决**:

1. 确保插件在 `plugins.entries` 中启用
2. 确保插件在 agent 的 `tools.allow` 列表中
3. 重启 gateway

### 问题 3: 依赖错误

**重新安装依赖**:

```bash
ssh openclaw "cd ~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex && \
  rm -rf node_modules pnpm-lock.yaml package-lock.json && \
  npm install"
```

### 问题 4: TypeScript 错误

**检查类型定义**:

```bash
ssh openclaw "cd ~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex && \
  npx tsc --noEmit index.ts"
```

## 🔄 更新部署

```bash
# 脚本化更新（推荐）
cat > /tmp/sync-bridgers.sh << 'EOF'
#!/bin/bash
set -e

echo "Syncing bridgers-dex extension..."
rsync -avz \
  /Users/zhangleping/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/ \
  openclaw:~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/

echo "Installing dependencies on server..."
ssh openclaw "cd ~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex && npm install"

echo "Restarting gateway..."
ssh openclaw "cd ~/github.com/holynull/openclaw && docker compose restart openclaw-gateway-2"

echo "Waiting for gateway to start..."
sleep 5

echo "Verifying deployment..."
ssh openclaw "docker exec openclaw-openclaw-gateway-2 openclaw plugins list | grep bridgers-dex"

echo "✅ Deployment complete!"
EOF

chmod +x /tmp/sync-bridgers.sh
/tmp/sync-bridgers.sh
```

## 📝 与 Skill 的对比

### Extension (bridgers-dex) vs Skill (bridgers_exchange)

| 特性         | Extension                  | Skill                                      |
| ------------ | -------------------------- | ------------------------------------------ |
| **位置**     | `extensions/bridgers-dex/` | `workspace/main/skills/bridgers_exchange/` |
| **注册方式** | `api.registerTool()`       | Markdown 文档 (SKILL.md)                   |
| **工具形式** | OpenClaw 原生工具          | Agent 可调用的指令                         |
| **类型安全** | TypeScript + Schema        | Markdown 描述                              |
| **可复用性** | 跨 Agent 共享              | 特定 Agent                                 |
| **依赖管理** | package.json               | 无依赖管理                                 |
| **安装方式** | `openclaw plugins install` | 直接复制文件                               |
| **推荐场景** | 通用 API 集成              | Agent 特定逻辑                             |

### 推荐使用 Extension

**优势**:

- ✅ 更专业的包管理
- ✅ 类型安全和编译时检查
- ✅ 可通过 npm 发布和安装
- ✅ 跨多个 Agent 共享
- ✅ 更好的错误处理
- ✅ 集成到 OpenClaw 工具系统

**Extension 适用于**:

- API 集成（如 Bridgers, DEX, Exchange）
- 可复用的功能模块
- 需要复杂依赖的功能
- 团队协作和发布

**Skill 适用于**:

- Agent 特定的工作流程
- 简单的指令集合
- 快速原型和实验
- 个人使用的定制化功能

## 🎯 下一步

1. ✅ **部署 Extension** - 使用上述步骤
2. ⚡ **测试功能** - 通过 Feishu 测试兑换流程
3. 🔗 **集成 wallet-manager** - 实现完整的签名和广播
4. 📊 **监控使用** - 收集用户反馈
5. 🚀 **持续优化** - 根据使用情况改进

## 📚 相关文档

- [OpenClaw Plugin 官方文档](https://docs.openclaw.ai/tools/plugin)
- [Extension README](./README.md)
- [Bridgers API 文档](https://docs-bridgers.bridgers.xyz/)
- [wallet-manager Extension](../wallet-manager/README.md)

---

**版本**: 1.0.0  
**最后更新**: 2026-03-30
