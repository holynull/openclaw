---
name: feishu-reminder
description: |
  🚨 WHEN USER SAYS "提醒大家" → MUST CALL cron.add + send_feishu_reminder WITH mentionUserId='all' 🚨

  Quick rule:
  "提醒大家X" → MUST call cron.add → send_feishu_reminder(targetId=oc_xxx, message='⏰ 提醒大家：X', mentionUserId='all')
  "提醒我X" → MUST call cron.add → send_feishu_reminder(targetId=oc_xxx/ou_xxx, message='⏰ 提醒：X', mentionUserId=ou_sender)
  "提醒X" → MUST call cron.add → send_feishu_reminder(targetId=oc_xxx/ou_xxx, message='⏰ 提醒：X')

  💡 NEW: Support rich context & conversation reference:
  - Use `details` parameter to include referenced conversation or additional context
  - Details will be displayed in a separate section with better formatting
  - Great for reminders that reference previous discussions

  ALWAYS call cron.add tool for ANY TIME (relative or absolute):
  - "X分钟后提醒" → calculate future time, call cron.add
  - "今天HH:MM提醒" → parse time, call cron.add
  - "明天HH:MM提醒" → parse time, call cron.add

  Example 1 - Simple reminder:
  {"tool":"cron.add","name":"提醒：开会","schedule":{"kind":"at","at":"2026-03-30T14:00:00+08:00"},"payload":{"kind":"agentTurn","message":"调用 send_feishu_reminder 工具发送提醒：targetId='oc_xxx', message='⏰ 提醒大家：开会', mentionUserId='all'"},"delivery":{"channel":"feishu"},"sessionTarget":"current","deleteAfterRun":true,"wakeMode":"now"}

  Example 2 - Rich reminder with context:
  {"tool":"cron.add","name":"提醒：讨论方案","schedule":{"kind":"at","at":"2026-03-30T17:30:00+08:00"},"payload":{"kind":"agentTurn","message":"调用 send_feishu_reminder 工具发送提醒：targetId='oc_xxx', message='⏰ 提醒：讨论方案', details='之前提到的优化建议：\\n1. 减少API调用次数\\n2. 增加缓存层\\n3. 异步处理非关键任务', mentionUserId='all'"},"delivery":{"channel":"feishu"},"sessionTarget":"current","deleteAfterRun":true,"wakeMode":"now"}

  FORBIDDEN: replying without calling cron.add!
  MANDATORY: ALWAYS call cron.add for reminders, NEVER just reply!
---

# Feishu Reminder Skill

## Critical Rules

**1. ALWAYS call cron.add tool when user requests ANY reminder!**

**DO NOT just reply "好，我会提醒" without calling the tool!**

User says ANY of these patterns → YOU MUST call cron.add:

- "X分钟后提醒..." (relative time)
- "今天HH:MM提醒..." (absolute time today)
- "明天HH:MM提醒..." (absolute time tomorrow)
- "X点提醒..." (time without date)

**2. When user says "提醒大家" or "提醒所有人", YOU MUST set mentionUserId='all'!**

**3. NEW: When user references previous conversation or wants rich context, YOU SHOULD use the `details` parameter!**

**4. 🆕 IMPORTANT: Auto-extract reply/quote context!**

- When user's reminder request is **replying to a message**, ALWAYS extract that message content to `details`
- When user says "刚才说的"/"之前提到的", extract the referenced conversation to `details`
- Format: Include both the original message and your response if applicable

## Tool: `send_feishu_reminder`

Parameters:

- `targetId` (required): oc_xxx (group) or ou_xxx (private)
- `message` (required): Reminder message text (main content)
- `details` (optional): Additional context, referenced conversation, or detailed information
- `mentionUserId` (optional):
  - `'all'` → @所有人 (when user says 提醒大家)
  - `'ou_xxx'` → @specific user (when user says 提醒我, use sender's ou\_)
  - omit → no @

## Examples

### Private chat reminder (relative time)

User: "一分钟后提醒我开会"

Tool call: `send_feishu_reminder(targetId='ou_xxx', message='⏰ 提醒：开会')`

### Group reminder without @ (relative time)

User: "一分钟后提醒开会"

Tool call: `send_feishu_reminder(targetId='oc_xxx', message='⏰ 提醒：开会')`

### Group reminder @all (relative time)

User: "一分钟后提醒大家开会"

Tool call: `send_feishu_reminder(targetId='oc_xxx', message='⏰ 提醒大家：开会', mentionUserId='all')`

### Rich reminder with conversation reference

User: "明天下午3点提醒大家讨论刚才说的优化方案"

Context: Previous conversation mentioned API optimization, caching, and async processing

Tool call:

```python
send_feishu_reminder(
  targetId='oc_xxx',
  message='⏰ 提醒大家：讨论优化方案',
  details='之前讨论的优化建议：\n1. 减少API调用次数\n2. 增加缓存层\n3. 异步处理非关键任务',
  mentionUserId='all'
)
```

### Reminder with quoted conversation

User: "2小时后提醒我回复刚才张三问的问题"

Context: 张三之前在对话中问了关于部署流程的问题

Tool call:

```python
send_feishu_reminder(
  targetId='ou_xxx',
  message='⏰ 提醒：回复张三的问题',
  details='张三的问题：\n"部署流程中需要先停止服务还是可以滚动更新？"\n\n你可以回复：建议使用滚动更新，无需停止服务。'
)
```

### Group reminder with task details

User: "明天早上9点提醒大家今天的任务"

Context: Today's meeting discussed three tasks

Tool call:

```python
send_feishu_reminder(
  targetId='oc_xxx',
  message='⏰ 提醒大家：今日任务',
  details='今日任务清单：\n✅ 1. 完成API文档（负责人：李四）\n✅ 2. 代码审查（负责人：王五）\n✅ 3. 部署到测试环境（负责人：赵六）\n\n截止时间：今日18:00',
  mentionUserId='all'
)
```

### 🆕 Reply-based reminder (Auto-extract reply context)

**Scenario:** User replies to a previous message asking for a reminder

Original message (from user or others):

```
我们需要优化部署流程：
1. 使用滚动更新
2. 增加健康检查
3. 配置自动回滚
```

User replies to that message:

```
2分钟后提醒我这个方案
```

**CRITICAL:** System provides reply context in metadata:

```json
{
  "has_reply_context": true,
  "reply_to_id": "om_xxx",
  "replied_message": {
    "body": "我们需要优化部署流程：\n1. 使用滚动更新\n2. 增加健康检查\n3. 配置自动回滚"
  }
}
```

**YOU MUST extract this to details!**

Tool call:

```python
send_feishu_reminder(
  targetId='ou_xxx',
  message='⏰ 提醒：部署优化方案',
  details='引用的消息：\n"我们需要优化部署流程：\n1. 使用滚动更新\n2. 增加健康检查\n3. 配置自动回滚"'
)
```

### 🆕 Reply with your response context

**Scenario:** User had a question, you answered, user wants reminder

User asked:

```
Docker 日志应该存储在哪里？
```

You answered:

```
建议使用 volume 挂载到宿主机，这样便于：
1. 日志持久化保存
2. 容器重启不丢失
3. 便于集中收集和分析
```

User replies to their own question:

```
1小时后提醒我这个 Docker 日志的方案
```

Tool call:

```python
send_feishu_reminder(
  targetId='ou_xxx',
  message='⏰ 提醒：Docker 日志存储方案',
  details='问题：Docker 日志应该存储在哪里？\n\n方案：\n使用 volume 挂载到宿主机，这样便于：\n1. 日志持久化保存\n2. 容器重启不丢失\n3. 便于集中收集和分析'
)
```

### Group reminder @all (absolute time)

User: "今天17:30提醒大家同步进度"

```json
{
  "tool": "cron.add",
  "name": "提醒：同步进度",
  "schedule": { "kind": "at", "at": "2026-03-30T17:30:00+08:00" },
  "payload": {
    "kind": "agentTurn",
    "message": "调用 send_feishu_reminder 工具发送提醒：targetId='oc_xxx', message='⏰ 提醒大家：同步进度', mentionUserId='all'"
  },
  "delivery": { "channel": "feishu" },
  "sessionTarget": "current",
  "deleteAfterRun": true,
  "wakeMode": "now"
}
```

### Group reminder @all (absolute time variant)

User: "今天18:03提醒大家同步进度"

```json
{
  "tool": "cron.add",
  "name": "提醒：同步进度",
  "schedule": { "kind": "at", "at": "2026-03-30T18:03:00+08:00" },
  "payload": {
    "kind": "agentTurn",
    "message": "调用 send_feishu_reminder 工具发送提醒：targetId='oc_xxx', message='⏰ 提醒大家：同步进度', mentionUserId='all'"
  },
  "delivery": { "channel": "feishu" },
  "sessionTarget": "current",
  "deleteAfterRun": true,
  "wakeMode": "now"
}
```

## Complete Tool Call Example

For user message: "2分钟后提醒大家多运动"

```json
{
  "tool": "cron.add",
  "name": "提醒：多运动",
  "schedule": {
    "kind": "at",
    "at": "2026-03-30T12:45:00+08:00"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "调用 send_feishu_reminder 工具发送提醒：targetId='oc_53d1a541f08d2d9f2e8c3c79a1f12fc3', message='⏰ 提醒大家：多运动', mentionUserId='all'"
  },
  "delivery": {
    "channel": "feishu"
  },
  "sessionTarget": "current",
  "deleteAfterRun": true,
  "wakeMode": "now"
}
```

**Key point: Use send_feishu_reminder tool with mentionUserId='all' for @all!**

## Forbidden

- ❌ Do NOT just reply "好，我会提醒" without calling cron.add tool!
- ❌ Do NOT use "请在当前飞书群里发送这条消息"
- ❌ Do NOT use message tool
- ❌ Do NOT use bash scripts
- ❌ Do NOT reply without tool call when user requests reminder

## How It Works

1. User requests a Feishu reminder in natural language
2. **MUST call cron.add tool** (do not just reply!)
3. Parse time:
   - Relative: "X分钟后" → calculate future timestamp
   - Absolute: "今天HH:MM" → parse to today's timestamp (Beijing time UTC+8)
   - Absolute: "明天HH:MM" → parse to tomorrow's timestamp
4. Determine mention target based on user's language:
   - Contains "提醒大家" or "提醒所有人" → set `mentionUserId='all'`
   - Contains "提醒我" in group → set `mentionUserId='ou_sender'`
   - No specific target → omit mentionUserId
5. **🆕 Extract context from conversation (CRITICAL for rich reminders):**
   - **PRIORITY 1:** If message has `has_reply_context: true` → ALWAYS extract `replied_message.body` to `details`
   - **PRIORITY 2:** User says "刚才说的" / "之前提到的" → include relevant context in `details`
   - **PRIORITY 3:** User says "那个问题" / "那件事" → summarize the referenced topic in `details`
   - **PRIORITY 4:** User says "回复XX的问题" → include both question and suggested answer in `details`
   - Format details with clear structure: "引用的消息：\n[content]" or "问题：\n[question]\n\n方案：\n[answer]"
6. Call `cron.add` tool with send_feishu_reminder in payload.message
7. Reply to user: "好，[time description] 我会提醒[target]"
8. Job executes at scheduled time → sends reminder (with rich card if details provided)
