#!/usr/bin/env bash
# OpenClaw 第二套实例初始化脚本
# 参考 docker-setup.sh，为第二套实例进行配置初始化

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================="
echo "OpenClaw 第二套实例初始化"
echo "=====================================${NC}"
echo ""

# 检查 .env 文件
if [[ ! -f ".env" ]]; then
    echo -e "${RED}错误: 未找到 .env 文件${NC}"
    exit 1
fi

# 加载环境变量
set -a
source .env
set +a

# 检查必要的配置
if [[ -z "${OPENCLAW_CONFIG_DIR_2:-}" ]]; then
    echo -e "${RED}错误: .env 中未配置 OPENCLAW_CONFIG_DIR_2${NC}"
    exit 1
fi

if [[ -z "${OPENCLAW_WORKSPACE_DIR_2:-}" ]]; then
    echo -e "${RED}错误: .env 中未配置 OPENCLAW_WORKSPACE_DIR_2${NC}"
    exit 1
fi

# 展开波浪号
CONFIG_DIR_2="${OPENCLAW_CONFIG_DIR_2/#\~/$HOME}"
WORKSPACE_DIR_2="${OPENCLAW_WORKSPACE_DIR_2/#\~/$HOME}"

echo -e "${YELLOW}配置信息:${NC}"
echo "  配置目录: $CONFIG_DIR_2"
echo "  工作空间: $WORKSPACE_DIR_2"
echo "  Gateway 端口: ${OPENCLAW_GATEWAY_PORT_2:-28789}"
echo "  Bridge 端口: ${OPENCLAW_BRIDGE_PORT_2:-28790}"
echo ""

# 1. 创建目录结构
echo -e "${YELLOW}步骤 1: 创建目录结构${NC}"
mkdir -p "$CONFIG_DIR_2/identity"
mkdir -p "$CONFIG_DIR_2/agents/main/agent"
mkdir -p "$CONFIG_DIR_2/agents/main/sessions"
mkdir -p "$WORKSPACE_DIR_2"
echo -e "${GREEN}✓ 目录结构已创建${NC}"
echo ""

# 2. 修复权限
echo -e "${YELLOW}步骤 2: 修复目录权限${NC}"

docker run --rm --user root \
  -v "$CONFIG_DIR_2:/home/node/.openclaw" \
  -v "$WORKSPACE_DIR_2:/home/node/.openclaw/workspace" \
  "${OPENCLAW_IMAGE:-openclaw:local}" \
  sh -c "find /home/node/.openclaw -xdev -exec chown node:node {} + && \
         [ -d /home/node/.openclaw/workspace/.openclaw ] && chown -R node:node /home/node/.openclaw/workspace/.openclaw || true"

echo -e "${GREEN}✓ 权限已修复${NC}"
echo ""

# 3. 运行 onboard 初始化配置
echo -e "${YELLOW}步骤 3: 初始化配置（onboard）${NC}"
echo "这将启动交互式配置向导..."
echo ""

docker run --rm -it \
  -v "$CONFIG_DIR_2:/home/node/.openclaw" \
  -v "$WORKSPACE_DIR_2:/home/node/.openclaw/workspace" \
  -e HOME=/home/node \
  -e TERM=xterm-256color \
  "${OPENCLAW_IMAGE:-openclaw:local}" \
  node dist/index.js onboard --mode local --no-install-daemon

echo ""
echo -e "${GREEN}✓ 配置已初始化${NC}"
echo ""

# 4. 设置 gateway mode 和 bind
echo -e "${YELLOW}步骤 4: 设置 Gateway 配置${NC}"
GATEWAY_BIND="${OPENCLAW_GATEWAY_BIND:-lan}"

docker run --rm \
  -v "$CONFIG_DIR_2:/home/node/.openclaw" \
  -v "$WORKSPACE_DIR_2:/home/node/.openclaw/workspace" \
  "${OPENCLAW_IMAGE:-openclaw:local}" \
  node dist/index.js config set gateway.mode local >/dev/null

docker run --rm \
  -v "$CONFIG_DIR_2:/home/node/.openclaw" \
  -v "$WORKSPACE_DIR_2:/home/node/.openclaw/workspace" \
  "${OPENCLAW_IMAGE:-openclaw:local}" \
  node dist/index.js config set gateway.bind "$GATEWAY_BIND" >/dev/null

echo -e "${GREEN}✓ 已设置 gateway.mode=local 和 gateway.bind=$GATEWAY_BIND${NC}"
echo ""

# 5. 设置 control UI allowed origins
echo -e "${YELLOW}步骤 5: 配置 Control UI 访问控制${NC}"
GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT_2:-28789}"
if [[ "$GATEWAY_BIND" != "loopback" ]]; then
    ALLOWED_ORIGIN_JSON="[\"http://127.0.0.1:$GATEWAY_PORT\"]"
    docker run --rm \
      -v "$CONFIG_DIR_2:/home/node/.openclaw" \
      -v "$WORKSPACE_DIR_2:/home/node/.openclaw/workspace" \
      "${OPENCLAW_IMAGE:-openclaw:local}" \
      node dist/index.js config set gateway.controlUi.allowedOrigins "$ALLOWED_ORIGIN_JSON" --strict-json >/dev/null
    echo -e "${GREEN}✓ 已设置 Control UI 访问控制: $ALLOWED_ORIGIN_JSON${NC}"
else
    echo -e "${GREEN}✓ loopback 模式，跳过 Control UI 访问控制配置${NC}"
fi
echo ""

echo -e "${GREEN}====================================="
echo "初始化完成！"
echo "=====================================${NC}"
echo ""
echo "下一步操作:"
echo ""
echo "1. 配置 Channel (可选):"
echo "   Telegram:"
echo "     OPENCLAW_CONFIG_DIR='$CONFIG_DIR_2' docker compose run --rm openclaw-cli channels add --channel telegram --token <token>"
echo ""
echo "   Discord:"
echo "     OPENCLAW_CONFIG_DIR='$CONFIG_DIR_2' docker compose run --rm openclaw-cli channels add --channel discord --token <token>"
echo ""
echo "   WhatsApp (QR):"
echo "     OPENCLAW_CONFIG_DIR='$CONFIG_DIR_2' docker compose run --rm openclaw-cli channels login"
echo ""
echo "2. 启动第二套实例:"
echo "   docker-compose --profile second-instance up -d openclaw-gateway-2 openclaw-cli-2"
echo ""
echo "3. 验证运行状态:"
echo "   docker ps | grep openclaw"
echo "   curl http://localhost:$GATEWAY_PORT/healthz"
echo ""
