---
name: feishu-reminder
description: Schedule Feishu reminders using OpenClaw cron tool. Handles natural language like "1分钟后提醒我开会" and creates timed push notifications.
---

# Feishu Reminder Skill

Schedule push notifications to Feishu using OpenClaw's cron scheduler.

## ⚠️ CRITICAL: Use cron.add TOOL, NOT CLI

**YOU MUST call the `cron.add` TOOL directly with job parameters.**

## 🚨 CRITICAL: Let OpenClaw Auto-Infer the Delivery Configuration!

**IMPORTANT:** Do NOT manually set the `delivery` field in your cron job!

OpenClaw has built-in logic to automatically infer the delivery configuration from the current session key. If you manually set `delivery.channel` or `delivery.to`, it will DISABLE the auto-inference and cause delivery to fail!

**✅ CORRECT APPROACH - Let the tool infer delivery:**

```json
{
  "tool": "cron.add",
  "schedule": { "kind": "at", "at": "ISO8601_TIME" },
  "payload": {
    "kind": "agentTurn",
    "message": "reminder message here"
  },
  "sessionTarget": "isolated",
  "wakeMode": "now",
  "deleteAfterRun": true
  // ✅ NO "delivery" field - let OpenClaw infer it automatically!
}
```

**❌ WRONG APPROACH - Manually setting delivery:**

```json
{
  "delivery": {
    "mode": "announce",
    "channel": "feishu" // ❌ This breaks auto-inference!
  }
}
```

**WHY THIS WORKS:**

OpenClaw's cron tool (`inferDeliveryFromSessionKey()`) automatically:

1. Parses your current session key (e.g., `agent:main:feishu:direct:ou_abc123xyz`)
2. Extracts the channel (`feishu`) and peer ID (`ou_abc123xyz`)
3. Constructs the correct delivery config:
   ```json
   {
     "mode": "announce",
     "channel": "feishu",
     "to": "ou_abc123xyz"
   }
   ```

**WHEN AUTO-INFERENCE HAPPENS:**

The tool will auto-infer delivery ONLY if:

- `delivery` is null/undefined, OR
- `delivery.channel` and `delivery.to` are both empty/missing
- `delivery.mode` is empty or "announce"

If you set `delivery.channel`, the tool thinks you're manually configuring it and skips inference, but then `delivery.to` is missing and delivery fails!

**DO NOT use:**

- ❌ `exec` tool with `openclaw cron` commands
- ❌ Any CLI approach (`openclaw cron add ...`)
- ❌ Shell commands
- ❌ Wrong tool name like `cron` (use `cron.add`)
- ❌ Manually setting the delivery field (breaks auto-inference!)

**ONLY use:**

- ✅ Tool name: `cron.add`
- ✅ Direct job definition as parameters (see complete example below)
- ✅ Do NOT set delivery field - let OpenClaw infer it

## When to use this skill

When user says things like:

- "一分钟后提醒我开会"
- "5分钟后提醒我休息"
- "明天上午9点提醒我打电话"

## How It Works

**Step 1: Parse user request**

- Extract: delay time (e.g., "1分钟") or absolute time (e.g., "明天9点")
- Extract: reminder content (e.g., "开会", "休息")
- Convert to ISO 8601 format with timezone (Asia/Shanghai UTC+8)

**Step 2: Create cron job**

**MANDATORY: Use the `cron.add` TOOL (not CLI):**

Example tool call:

```json
{
  "tool": "cron.add",
  "name": "提醒：开会",
  "schedule": {
    "kind": "at",
    "at": "2026-03-27T17:30:00+08:00"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "DELIVER THIS EXACT MESSAGE TO THE USER WITHOUT MODIFICATION OR COMMENTARY:\n\n⏰ 提醒：该开会了"
  },
  "sessionTarget": "isolated",
  "deleteAfterRun": true,
  "wakeMode": "now"
}
```

**Note:** Do NOT set the `delivery` field! OpenClaw will automatically infer it from your current session key.

**NEVER use CLI commands like:**

```bash
# ❌ WRONG - DO NOT DO THIS
openclaw cron add --at ... --message ...
```

**Step 3: Confirm to user**

If successful, tell user:

```
好的，已设置 17:30 的提醒（开会）
```

## Critical Rules

### ✅ MANDATORY - YOU MUST DO THIS:

1. **Call `cron.add` TOOL directly** - Tool name is "cron.add" (NOT just "cron")
2. **Pass job definition directly** - No "action" or "job" wrapper needed
3. **Use `agentTurn` payload** for push notifications (NOT `systemEvent` - that's silent!)
4. **Use `isolated` sessionTarget** for dedicated delivery
5. **Extract and use `sender_id`** from conversation metadata as `delivery.to`
6. **Include timezone** in ISO timestamp (+08:00 for Shanghai)
7. **Set `deleteAfterRun: true`** for one-time reminders
8. **Set `wakeMode: "now"`** for immediate scheduling
9. **Use strict message format** to avoid AI commentary

**CRITICAL: agentTurn vs systemEvent**

- ✅ `agentTurn` = **Push notification** (pings user's phone/app)
- ❌ `systemEvent` = **Silent log** (only in chat history, NO notification)

### ❌ ABSOLUTELY FORBIDDEN - NEVER DO THIS:

1. ❌ **NEVER use `exec` tool** with `openclaw cron` CLI commands
2. ❌ **NEVER use shell commands** like `bash -c 'openclaw cron ...'`
3. ❌ **NEVER use `openclaw cron add`** in any form
4. ❌ Don't use `sessions_spawn` for delays
5. ❌ Don't use `sleep` commands
6. ❌ Don't use `message` tool (Feishu doesn't support it)
7. ❌ Don't use `systemEvent` (it won't send push notifications)
8. ❌ Don't promise reminders without successful cron creation

**If you find yourself typing "openclaw cron" or "exec", STOP IMMEDIATELY and use the `cron` TOOL instead.**

## Time Calculation Examples

**IMPORTANT: Extract sender_id from conversation metadata**

Every Feishu message includes metadata like:

```json
{
  "message_id": "om_x...",
  "sender_id": "ou_xxx...",
  "timestamp": "..."
}
```

**Use this `sender_id` as `delivery.to` to ensure the reminder goes to the right person.**
**IMPORTANT: Extract the actual sender_id from the current session key (the part after the last colon).**

**Relative time (from current time):**

```
User: "一分钟后提醒我"
Current: 2026-03-27 09:00:00 UTC (17:00:00 +08:00)
Target:  2026-03-27 09:01:00 UTC (17:01:00 +08:00)
ISO:     "2026-03-27T17:01:00+08:00"
```

**Absolute time (today):**

```
User: "下午3点提醒我"
Current: 2026-03-27 09:00:00 UTC (17:00:00 +08:00)
Target:  2026-03-27 07:00:00 UTC (15:00:00 +08:00)
ISO:     "2026-03-27T15:00:00+08:00"
```

**Tomorrow:**

```
User: "明天上午9点提醒我"
Current: 2026-03-27 09:00:00 UTC
Target:  2026-03-28 01:00:00 UTC (09:00:00 +08:00)
ISO:     "2026-03-28T09:00:00+08:00"
```

## Message Format

**CRITICAL:** Use this exact format for the message to avoid AI commentary:

```
DELIVER THIS EXACT MESSAGE TO THE USER WITHOUT MODIFICATION OR COMMENTARY:

⏰ 提醒：{用户指定的内容}
```

This ensures the reminder is clean and direct.

## Error Handling

**If cron tool fails:**

1. Tell user honestly: "抱歉，定时提醒功能目前不可用"
2. Explain reason if available (e.g., "cron工具连接超时")
3. Offer alternative: "我现在可以立即用 feishu_chat 发送消息，但无法延时发送"

**Never:**

- Don't claim reminder is set if cron failed
- Don't use workarounds that don't actually work
- Don't silently fail

## Complete Example

**User:** "一分钟后提醒我开会"

**Agent actions:**

1. Calculate time: Current + 1 minute → ISO format
2. **Call cron.add TOOL (NOT CLI!):**

```json
{
  "tool": "cron.add",
  "name": "提醒：开会",
  "schedule": {
    "kind": "at",
    "at": "2026-03-27T17:01:00+08:00"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "DELIVER THIS EXACT MESSAGE TO THE USER WITHOUT MODIFICATION OR COMMENTARY:\n\n⏰ 提醒：该开会了"
  },
  "sessionTarget": "isolated",
  "delivery": {
    "mode": "announce",
    "channel": "feishu",
    "to": "<sender_id_from_session_key>"
  },
  "deleteAfterRun": true,
  "wakeMode": "now"
}
```

**Important:** Extract the `sender_id` from the current session key (the part after the last colon, starting with `ou_`) and use it as `delivery.to`.

3. If success, reply: "好的，已设置 17:01 的提醒（开会）"
4. At 17:01, user receives Feishu push notification: "⏰ 提醒：该开会了"

## ⚠️ Final Reminder

**THIS IS A `cron.add` TOOL SKILL, NOT A CLI SKILL.**

**Tool name must be: `cron.add` (NOT `cron`)**

If you see yourself about to type:

- `exec`
- `openclaw cron`
- `bash -c`
- `"tool": "cron"` (wrong! use `"tool": "cron.add"`)

**STOP! You are doing it wrong. Use the `cron.add` TOOL instead.**

## Reference

- Timezone: Asia/Shanghai (UTC+8)
- Cron docs: https://docs.openclaw.ai/automation/cron-jobs
- Use `cron-mastery` skill for advanced scheduling patterns
