#!/bin/bash
# 飞书提醒消息发送脚本 - 支持私聊和群聊，支持@提醒

set -e

# 检查参数
if [ $# -lt 2 ]; then
    echo "用法: $0 <目标ID> <提醒内容> [mention_user_id]"
    echo "目标ID可以是："
    echo "  - 用户open_id (以ou_开头): 发送私聊消息"
    echo "  - 群聊chat_id (以oc_开头): 发送群消息"
    echo ""
    echo "mention_user_id (可选，仅对群聊有效):"
    echo "  - ou_xxx: @某个用户"
    echo "  - all: @所有人"
    echo "  - 不提供: 不@任何人"
    echo ""
    echo "示例:"
    echo "  $0 ou_xxx '⏰ 提醒：开会时间到了'                    # 私聊"
    echo "  $0 oc_xxx '⏰ 提醒：该吃饭了'                        # 群聊，不@"
    echo "  $0 oc_xxx '⏰ 提醒：该吃饭了' ou_yyy                # 群聊，@某人"
    echo "  $0 oc_xxx '⏰ 提醒：该吃饭了' all                   # 群聊，@所有人"
    exit 1
fi

TARGET_ID="$1"
REMINDER_TEXT="$2"
MENTION_USER_ID="${3:-}"  # 可选参数，默认为空

# 验证必需的环境变量
if [ -z "$FEISHU_APP_ID" ] || [ -z "$FEISHU_APP_SECRET" ]; then
    echo "错误：缺少飞书环境变量 FEISHU_APP_ID 或 FEISHU_APP_SECRET"
    exit 1
fi

# 根据ID前缀判断目标类型
if [[ "$TARGET_ID" == ou_* ]]; then
    RECEIVE_ID_TYPE="open_id"
    TARGET_TYPE="用户"
    # 私聊不支持@，忽略mention参数
    if [ -n "$MENTION_USER_ID" ]; then
        echo "⚠️  警告：私聊消息不支持@功能，将忽略mention参数"
        MENTION_USER_ID=""
    fi
elif [[ "$TARGET_ID" == oc_* ]]; then
    RECEIVE_ID_TYPE="chat_id"
    TARGET_TYPE="群聊"
else
    echo "错误：无法识别目标ID类型: $TARGET_ID"
    echo "必须以 ou_ (用户) 或 oc_ (群聊) 开头"
    exit 1
fi

echo "=== 发送飞书提醒 ==="
echo "时间: $(date)"
echo "目标类型: $TARGET_TYPE"
echo "目标ID: $TARGET_ID"
if [ -n "$MENTION_USER_ID" ]; then
    if [ "$MENTION_USER_ID" == "all" ]; then
        echo "@提醒: 所有人"
    else
        echo "@提醒: $MENTION_USER_ID"
    fi
fi
echo "提醒内容: $REMINDER_TEXT"

# 获取飞书 Access Token
ACCESS_TOKEN=$(python3 << 'PYTHON_EOF'
import json
import os
import urllib.request

app_id = os.environ["FEISHU_APP_ID"]
app_secret = os.environ["FEISHU_APP_SECRET"]

payload = {"app_id": app_id, "app_secret": app_secret}
url = "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal"
headers = {"Content-Type": "application/json"}

try:
    req = urllib.request.Request(url, json.dumps(payload).encode(), headers)
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        if "tenant_access_token" in result:
            print(result["tenant_access_token"])
        else:
            print("")
except Exception as e:
    print("", file=sys.stderr)
    print(f"Token获取失败: {e}", file=sys.stderr)
PYTHON_EOF
)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo "❌ 无法获取飞书访问令牌"
    exit 1
fi

echo "✅ 访问令牌获取成功"

# 导出环境变量供 Python 使用
export TARGET_ID RECEIVE_ID_TYPE ACCESS_TOKEN REMINDER_TEXT MENTION_USER_ID

# 使用 Python 构建 JSON 并发送
RESULT=$(python3 << 'PYTHON_EOF'
import json
import os
import sys
import urllib.request

target_id = os.environ["TARGET_ID"]
receive_id_type = os.environ["RECEIVE_ID_TYPE"]
access_token = os.environ["ACCESS_TOKEN"]
reminder_text = os.environ["REMINDER_TEXT"]
mention_user_id = os.environ.get("MENTION_USER_ID", "")

# 构建消息文本，如果有mention_user_id则添加@标记
if mention_user_id:
    # 飞书text消息的at格式：<at user_id="xxx"></at>
    message_text = f'<at user_id="{mention_user_id}"></at> {reminder_text}'
else:
    message_text = reminder_text

# 构建 JSON
payload = {
    "receive_id": target_id,
    "msg_type": "text",
    "content": json.dumps({"text": message_text})
}

# 发送请求
url = f"https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type={receive_id_type}"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

try:
    req = urllib.request.Request(url, json.dumps(payload).encode(), headers)
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        if result.get("code") == 0:
            msg_id = result.get("data", {}).get("message_id", "unknown")
            print(f"SUCCESS:{msg_id}")
        else:
            error_msg = result.get("msg", "Unknown error")
            print(f"ERROR:{error_msg}", file=sys.stderr)
            sys.exit(1)
except Exception as e:
    print(f"ERROR:Request failed: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_EOF
)

# 解析结果
if [[ "$RESULT" == SUCCESS:* ]]; then
    MSG_ID="${RESULT#SUCCESS:}"
    echo "✅ 提醒已成功发送"
    echo "消息ID: $MSG_ID"
    echo "=== 发送完成 ==="
    exit 0
else
    echo "❌ 提醒发送失败"
    exit 1
fi
