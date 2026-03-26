#!/bin/bash
# 飞书消息发送脚本 - 从文件读取内容并发送

set -e

# 检查参数
if [ $# -lt 1 ]; then
    echo "用法: $0 <报告文件路径>"
    exit 1
fi

REPORT_FILE="$1"

if [ ! -f "$REPORT_FILE" ]; then
    echo "错误：文件不存在: $REPORT_FILE"
    exit 1
fi

# 环境变量已通过 Docker 容器传入，无需额外加载
FEISHU_CHAT_ID="oc_53d1a541f08d2d9f2e8c3c79a1f12fc3"

# 验证必需的环境变量
if [ -z "$FEISHU_APP_ID" ] || [ -z "$FEISHU_APP_SECRET" ]; then
    echo "错误：缺少飞书环境变量 FEISHU_APP_ID 或 FEISHU_APP_SECRET"
    exit 1
fi

echo "=== 发送报告到飞书群 ==="
echo "时间: $(date)"
echo "Chat ID: $FEISHU_CHAT_ID"
echo "报告文件: $REPORT_FILE"

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

req = urllib.request.Request(url, json.dumps(payload).encode(), headers)
with urllib.request.urlopen(req) as response:
    result = json.loads(response.read().decode())
    if "tenant_access_token" in result:
        print(result["tenant_access_token"])
    else:
        print("")
PYTHON_EOF
)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo "❌ 无法获取飞书访问令牌"
    exit 1
fi

echo "✅ 访问令牌获取成功"

# 读取报告内容（限制长度）
REPORT_CONTENT=$(head -c 2800 "$REPORT_FILE")
FULL_MSG="📊 每日区块链安全报告 $(date +%Y-%m-%d)\n\n${REPORT_CONTENT}\n\n[完整报告: $REPORT_FILE]"

# 导出环境变量供 Python 使用
export FEISHU_CHAT_ID ACCESS_TOKEN FULL_MSG

# 使用 Python 构建 JSON 并发送
python3 << 'PYTHON_EOF'
import json
import os
import sys
import urllib.request

chat_id = os.environ["FEISHU_CHAT_ID"]
access_token = os.environ["ACCESS_TOKEN"]
full_msg = os.environ["FULL_MSG"]

# 构建 JSON
payload = {
    "receive_id": chat_id,
    "msg_type": "text",
    "content": json.dumps({"text": full_msg})
}

# 发送请求
url = "https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

req = urllib.request.Request(url, json.dumps(payload).encode(), headers)
try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        if result.get("code") == 0:
            print(f"✅ 报告已成功发送到飞书群")
            print(f"消息ID: {result['data']['message_id']}")
            sys.exit(0)
        else:
            print(f"❌ 发送失败")
            print(f"响应: {result}")
            sys.exit(1)
except Exception as e:
    print(f"❌ 发送失败: {e}")
    sys.exit(1)
PYTHON_EOF
