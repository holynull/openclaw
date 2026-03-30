---
name: feishu-reminder
description: |
  🚨 WHEN USER SAYS "提醒大家" → ADD "all" AS 3RD PARAM 🚨

  Quick rule:
  "提醒大家X" → ...sh oc_xxx '⏰ 提醒大家：X' all
  "提醒我X" → ...sh oc_xxx '⏰ 提醒：X' ou_sender
  "提醒X" → ...sh oc_xxx '⏰ 提醒：X'

  Example for "2分钟后提醒大家开会":
  {"tool":"cron.add","name":"提醒：开会","schedule":{"kind":"at","at":"2026-03-30T14:00:00+08:00"},"payload":{"kind":"agentTurn","message":"使用 bash 工具执行命令发送飞书提醒：/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒大家：开会' all"},"delivery":{"mode":"none"},"sessionTarget":"current","deleteAfterRun":true,"wakeMode":"now"}

  FORBIDDEN: "请在群里发送", message tool. ONLY bash command.
---

# Feishu Reminder Skill

## Critical Rule

**When user says "提醒大家" or "提醒所有人", YOU MUST add "all" as the 3rd parameter!**

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

### Private chat reminder

User: "一分钟后提醒我开会"

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh ou_xxx '⏰ 提醒：开会'
```

### Group reminder without @

User: "一分钟后提醒开会"

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒：开会'
```

### Group reminder @all

User: "一分钟后提醒大家开会"

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒大家：开会' all
```

### Group reminder @me

User: "一分钟后提醒我开会" (in group)

```
/home/node/.openclaw/scripts/send-feishu-reminder.sh oc_xxx '⏰ 提醒：开会' ou_sender
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

- ❌ Do NOT use "请在当前飞书群里发送这条消息"
- ❌ Do NOT use message tool
- ❌ Do NOT use any format except the bash command above

## How It Works

1. User requests a Feishu reminder in natural language
2. Parse time and content
3. Determine mention target based on user's language:
   - Contains "提醒大家" or "提醒所有人" → add `all`
   - Contains "提醒我" in group → add sender's `ou_xxx`
   - No specific target → omit 3rd param
4. Call `cron.add` tool with bash command in payload.message
5. Job executes at scheduled time
6. Bash script sends message via Feishu API with correct @ mention

## Session Target Extraction

Extract IDs from session key:

- Private: `agent:main:feishu:direct:ou_xxx` → use `ou_xxx`
- Group: `agent:main:feishu:group:oc_xxx` → use `oc_xxx`
- Sender's ou\_ can be obtained from message context
