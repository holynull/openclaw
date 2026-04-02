# Feishu Messaging Tools

OpenClaw 工具插件，用于发送飞书消息和通知。

## 功能

本插件提供两个工具，替代原有的 shell 脚本：

### 1. `send_feishu_reminder`

发送飞书提醒消息，支持私聊和群聊，支持 @提醒功能，**支持富文本上下文和引用对话**。

**参数：**

- `targetId` (必填): 目标 ID
  - 私聊：用户 open_id，格式为 `ou_xxx`
  - 群聊：群 chat_id，格式为 `oc_xxx`
- `message` (必填): 提醒消息主要内容
- `details` (可选): 🆕 **附加上下文、引用对话或详细信息**
  - 会以独立的格式化卡片区域显示
  - 适合引用之前的对话内容、任务清单、问题详情等
  - 支持多行文本和 Markdown 格式
- `mentionUserId` (可选): @提醒的用户 ID
  - `ou_xxx`: @某个用户
  - `all`: @所有人
  - 仅在群聊中有效

**消息格式：**

- **无 `details`**: 发送简单文本消息
- **有 `details`**: 发送富文本卡片消息（蓝色卡片头部 + 主要内容 + 上下文区域）

**示例：**

```typescript
// 私聊提醒
{
  targetId: "ou_xxx",
  message: "⏰ 提醒：开会时间到了"
}

// 带上下文的提醒（引用对话）
{
  targetId: "ou_xxx",
  message: "⏰ 提醒：回复张三的问题",
  details: "张三的问题：\n\"部署流程中需要先停止服务还是可以滚动更新？\"\n\n你可以回复：建议使用滚动更新，无需停止服务。"
}

// 群聊提醒，不@
{
  targetId: "oc_xxx",
  message: "⏰ 提醒：该吃饭了"
}

// 群聊提醒，带任务清单
{
  targetId: "oc_xxx",
  message: "⏰ 提醒大家：今日任务",
  details: "今日任务清单：\n✅ 1. 完成API文档（负责人：李四）\n✅ 2. 代码审查（负责人：王五）\n✅ 3. 部署到测试环境（负责人：赵六）\n\n截止时间：今日18:00",
  mentionUserId: "all"
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

### 场景 1：引用对话提醒

用户："2小时后提醒我回复刚才张三问的问题"

Agent 会：

- 提取张三之前的问题
- 在 `details` 参数中包含问题内容
- 发送富文本卡片提醒

实际调用：

```typescript
send_feishu_reminder({
  targetId: "ou_xxx",
  message: "⏰ 提醒：回复张三的问题",
  details:
    '张三的问题：\n"部署流程中需要先停止服务还是可以滚动更新？"\n\n你可以回复：建议使用滚动更新，无需停止服务。',
});
```

### 场景 2：任务总结提醒

用户："明天早上9点提醒大家今天讨论的任务"

Agent 会：

- 总结对话中提到的任务
- 格式化为列表放入 `details`
- @all 发送到群组

实际调用：

```typescript
send_feishu_reminder({
  targetId: "oc_xxx",
  message: "⏰ 提醒大家：今日任务",
  details:
    "今日任务清单：\n✅ 1. 完成API文档（负责人：李四）\n✅ 2. 代码审查（负责人：王五）\n✅ 3. 部署到测试环境（负责人：赵六）\n\n截止时间：今日18:00",
  mentionUserId: "all",
});
```

### 场景 3：定时任务 (Cron Jobs)

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

### 场景 4：Agent 技能 (Skills)

在 workspace skills 中使用：

```markdown
# Feishu Reminder Skill

使用 `send_feishu_reminder` 工具发送飞书提醒。支持引用对话上下文。

## 示例

- 简单提醒：send_feishu_reminder(targetId="ou_xxx", message="...")
- 带上下文：send_feishu_reminder(targetId="ou_xxx", message="...", details="...")
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
