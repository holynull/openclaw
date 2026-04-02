---
name: feishu-reminder
description: |
  🚨 WHEN USER SAYS "提醒大家" → MUST CALL cron.add + send_feishu_reminder WITH mentionUserId='all' 🚨

  Quick rule:
  "提醒大家X" → MUST call cron.add → send_feishu_reminder(targetId=oc_xxx, message='⏰ 提醒大家：X', mentionUserId='all')
  "提醒我X" → MUST call cron.add → send_feishu_reminder(targetId=oc_xxx/ou_xxx, message='⏰ 提醒：X', mentionUserId=ou_sender)
  "提醒X" → MUST call cron.add → send_feishu_reminder(targetId=oc_xxx/ou_xxx, message='⏰ 提醒：X')

  ALWAYS call cron.add tool for ANY TIME (relative or absolute):
  - "X分钟后提醒" → calculate future time, call cron.add
  - "今天HH:MM提醒" → parse time, call cron.add
  - "明天HH:MM提醒" → parse time, call cron.add

  Example 1 - "2分钟后提醒大家开会":
  {"tool":"cron.add","name":"提醒：开会","schedule":{"kind":"at","at":"2026-03-30T14:00:00+08:00"},"payload":{"kind":"agentTurn","message":"调用 send_feishu_reminder 工具发送提醒：targetId='oc_xxx', message='⏰ 提醒大家：开会', mentionUserId='all'"},"delivery":{"mode":"none"},"sessionTarget":"current","deleteAfterRun":true,"wakeMode":"now"}

  Example 2 - "今天17:30提醒大家同步进度":
  {"tool":"cron.add","name":"提醒：同步进度","schedule":{"kind":"at","at":"2026-03-30T17:30:00+08:00"},"payload":{"kind":"agentTurn","message":"调用 send_feishu_reminder 工具发送提醒：targetId='oc_xxx', message='⏰ 提醒大家：同步进度', mentionUserId='all'"},"delivery":{"mode":"none"},"sessionTarget":"current","deleteAfterRun":true,"wakeMode":"now"}

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

Tool: `send_feishu_reminder`

Parameters:

- `targetId` (required): oc_xxx (group) or ou_xxx (private)
- `message` (required): Reminder message text
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

### Group reminder @me (relative time, in group)

User: "一分钟后提醒我开会" (in group)

Tool call: `send_feishu_reminder(targetId='oc_xxx', message='⏰ 提醒：开会', mentionUserId='ou_sender')`

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
  "delivery": { "mode": "none" },
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
  "delivery": { "mode": "none" },
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
    "mode": "none"
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
- ❌ Do NOT use any format except the bash command above
- ❌ Do NOT reply without tool call when user requests reminder

## How It Works

1. User requests a Feishu reminder in natural language
2. **MUST call cron.add tool** (do not just reply!)
3. Parse time:
   - Relative: "X分钟后" → calculate future timestamp
   - Absolute: "今天HH:MM" → parse to today's timestamp (Beijing time UTC+8)
   - Absolute: "明天HH:MM" → parse to tomorrow's timestamp
4. Determine mebash scripts

- ❌ Do NOT use any tool except send_feishu_reminder
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
5. Call `cron.add` tool with send_feishu_reminder in payload.message
6. Reply to user: "好，[time description] 我会提醒[target]"
7. Job executes at scheduled time
8. send_feishu_reminder tool
