# Feishu Messaging Tools

OpenClaw 工具插件，用于发送飞书消息和通知。

## 功能

本插件提供两个工具，替代原有的 shell 脚本：

### 1. `send_feishu_reminder`

发送飞书提醒消息，支持私聊和群聊，支持 @提醒功能。

**参数：**

- `targetId` (必填): 目标 ID
  - 私聊：用户 open_id，格式为 `ou_xxx`
  - 群聊：群 chat_id，格式为 `oc_xxx`
- `message` (必填): 提醒消息内容
- `mentionUserId` (可选): @提醒的用户 ID
  - `ou_xxx`: @某个用户
  - `all`: @所有人
  - 仅在群聊中有效

**示例：**

```typescript
// 私聊提醒
{
  targetId: "ou_xxx",
  message: "⏰ 提醒：开会时间到了"
}

// 群聊提醒，不@
{
  targetId: "oc_xxx",
  message: "⏰ 提醒：该吃饭了"
}

// 群聊提醒，@某人
{
  targetId: "oc_xxx",
  message: "⏰ 提醒：该吃饭了",
  mentionUserId: "ou_yyy"
}

// 群聊提醒，@所有人
{
  targetId: "oc_xxx",
  message: "⏰ 提醒：该吃饭了",
  mentionUserId: "all"
}
```

### 2. `send_feishu_file_content`

从文件读取内容并发送到飞书群聊。适合发送报告等。

**参数：**

- `filePath` (必填): 要读取的文件路径
- `chatId` (必填): 飞书群 ID，格式为 `oc_xxx`
- `title` (可选): 消息标题/头部
- `maxLength` (可选): 最大读取字符数，默认 2800

**示例：**

```typescript
{
  filePath: "/tmp/blockchain-report.txt",
  chatId: "oc_53d1a541f08d2d9f2e8c3c79a1f12fc3",
  title: "📊 每日区块链安全报告",
  maxLength: 3000
}
```

## 环境变量

需要配置以下环境变量：

```bash
FEISHU_APP_ID="cli_xxx"
FEISHU_APP_SECRET="xxx"
```

## 使用场景

### 定时任务 (Cron Jobs)

在 `cron/cron-jobs.json` 中使用：

```json
{
  "id": "daily-reminder",
  "agentId": "team_bot",
  "schedule": {
    "kind": "cron",
    "expr": "0 10 * * *"
  },
  "task": {
    "kind": "message",
    "text": "使用 send_feishu_reminder 工具发送提醒到群 oc_xxx：今日站会时间到了 @all"
  }
}
```

### Agent 技能 (Skills)

在 workspace skills 中使用：

```markdown
# Feishu Reminder Skill

使用 `send_feishu_reminder` 工具发送飞书提醒。

## 示例

- 私聊提醒：send_feishu_reminder(targetId="ou_xxx", message="...")
- 群聊@提醒：send_feishu_reminder(targetId="oc_xxx", message="...", mentionUserId="all")
```

## 对比 Shell 脚本

### 优势

1. **原生集成**：Agent 可以直接调用工具，无需 bash 命令
2. **类型安全**：参数有类型验证和描述
3. **错误处理**：统一的错误返回格式
4. **跨平台**：使用 Node.js，不依赖 bash/python
5. **可维护性**：TypeScript 代码更易维护和扩展

### 迁移对照

**原 `send-feishu-reminder.sh`：**

```bash
./send-feishu-reminder.sh ou_xxx "提醒消息" all
```

**新工具：**

```typescript
send_feishu_reminder({
  targetId: "ou_xxx",
  message: "提醒消息",
  mentionUserId: "all",
});
```

**原 `send-to-feishu.sh`：**

```bash
./send-to-feishu.sh /tmp/report.txt
```

**新工具：**

```typescript
send_feishu_file_content({
  filePath: "/tmp/report.txt",
  chatId: "oc_53d1a541f08d2d9f2e8c3c79a1f12fc3",
  title: "📊 每日区块链安全报告",
});
```

## 安装

插件会自动随 OpenClaw 配置加载。确保在 `openclaw.json` 的 plugins 部分包含该插件。

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 测试
pnpm test
```

## License

与 OpenClaw 主项目相同
