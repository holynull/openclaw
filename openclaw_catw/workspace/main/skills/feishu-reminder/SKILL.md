---
name: feishu-reminder
description: |
  🚨 WHEN USER SAYS "提醒大家" → MUST CALL cron.add WITH "all" AS 3RD PARAM 🚨

  Quick rule:
  "提醒大家X" → MUST call cron.add → ...sh oc_xxx '⏰ 提醒大家：X' all
  "提醒我X" → MUST call cron.add → ...sh oc_xxx '⏰ 提醒：X' ou_sender
  "提醒X" → MUST call cron.add → ...sh oc_xxx '⏰ 提醒：X'

  ALWAYS call cron.add tool for ANY TIME (relative or absolute):
  - "X分钟后提醒" → calculate future time, call cron.add
  - "今天HH:MM提醒" → parse time, call cron.add
  - "明天HH:MM提醒" → parse time, call cron.add

  Example 1 - "2分钟后提醒大家开会":
  {"tool":"cron.add","name":"提醒：开会","schedule":{"kind":"at","at":"2026-03-30T14:00:00+08:00"},"payload":{"kind":"agentTurn","message":"使用 bash 工具执行命令发送飞书提醒：/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒大家：开会' all"},"delivery":{"mode":"none"},"sessionTarget":"current","deleteAfterRun":true,"wakeMode":"now"}

  Example 2 - "今天17:30提醒大家同步进度":
  {"tool":"cron.add","name":"提醒：同步进度","schedule":{"kind":"at","at":"2026-03-30T17:30:00+08:00"},"payload":{"kind":"agentTurn","message":"使用 bash 工具执行命令发送飞书提醒：/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒大家：同步进度' all"},"delivery":{"mode":"none"},"sessionTarget":"current","deleteAfterRun":true,"wakeMode":"now"}

  FORBIDDEN: "请在群里发送", message tool, replying without calling cron.add!
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

**2. When user says "提醒大家" or "提醒所有人", YOU MUST add "all" as the 3rd parameter!**

Script format:

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh <chat_id> '<text>' [mention]
```

Parameters:

- `<chat_id>`: oc_xxx (group) or ou_xxx (private)
- `'<text>'`: Reminder message
- `[mention]`: Optional 3rd param
  - `all` → @所有人 (when user says 提醒大家)
  - `ou_xxx` → @specific user (when user says 提醒我, use sender's ou\_)
  - omit → no @

## Examples

### Private chat reminder (relative time)

User: "一分钟后提醒我开会"

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh ou_xxx '⏰ 提醒：开会'
```

### Group reminder without @ (relative time)

User: "一分钟后提醒开会"

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒：开会'
```

### Group reminder @all (relative time)

User: "一分钟后提醒大家开会"

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒大家：开会' all
```

### Group reminder @me (relative time, in group)

User: "一分钟后提醒我开会" (in group)

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒：开会' ou_sender
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
    "message": "使用 bash 工具执行命令发送飞书提醒：/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒大家：同步进度' all"
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
    "message": "使用 bash 工具执行命令发送飞书提醒：/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒大家：同步进度' all"
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
    "message": "使用 bash 工具执行命令发送飞书提醒：/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_53d1a541f08d2d9f2e8c3c79a1f12fc3 '⏰ 提醒大家：多运动' all"
  },
  "delivery": {
    "mode": "none"
  },
  "sessionTarget": "current",
  "deleteAfterRun": true,
  "wakeMode": "now"
}
```

**Key point: Notice the "all" at the end of the bash command!**

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
4. Determine mention target based on user's language:
   - Contains "提醒大家" or "提醒所有人" → add `all`
   - Contains "提醒我" in group → add sender's `ou_xxx`
   - No specific target → omit 3rd param
5. Call `cron.add` tool with bash command in payload.message
6. Reply to user: "好，[time description] 我会提醒[target]"
7. Job executes at scheduled time
8. Bash script sends message via Feishu API with correct @ mention

## Session Target Extraction

Extract IDs from session key:

- Private: `agent:main:feishu:direct:ou_xxx` → use `ou_xxx`
- Group: `agent:main:feishu:group:oc_xxx` → use `oc_xxx`
- Sender's ou\_ can be obtained from message context
