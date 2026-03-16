#!/bin/bash

set -e

echo "🔐 Setting up SoftHSM Signing Service"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否已安装 SoftHSM
if ! command -v softhsm2-util &> /dev/null; then
    echo -e "${RED}❌ SoftHSM not installed${NC}"
    echo "Installing SoftHSM..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install softhsm
    elif [[ -f /etc/debian_version ]]; then
        sudo apt-get update && sudo apt-get install -y softhsm2
    elif [[ -f /etc/redhat-release ]]; then
        sudo yum install -y softhsm
    else
        echo -e "${RED}Unsupported OS. Please install SoftHSM manually.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ SoftHSM installed${NC}"

# 创建必要的目录
mkdir -p /var/lib/softhsm-wallet
mkdir -p ./logs

# 生成配置文件
cat > softhsm2.conf << EOF
directories.tokendir = /var/lib/softhsm-wallet
objectstore.backend = file
log.level = INFO
slots.removable = false
EOF

export SOFTHSM2_CONF=$(pwd)/softhsm2.conf

echo -e "${GREEN}✅ SoftHSM configuration created${NC}"

# 生成随机密码
SO_PIN=$(openssl rand -base64 32)
USER_PIN=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
API_KEY_SALT=$(openssl rand -base64 32)

# 初始化 Token
echo "Initializing SoftHSM token..."
softhsm2-util --init-token --slot 0 --label "wallet-custody" \
    --so-pin "$SO_PIN" \
    --pin "$USER_PIN"

echo -e "${GREEN}✅ SoftHSM token initialized${NC}"

# 生成 API Key 示例
TEST_API_KEY=$(openssl rand -hex 32)
TEST_SECRET=$(openssl rand -hex 32)
API_KEY_HASH=$(echo -n "${TEST_API_KEY}${TEST_SECRET}" | openssl dgst -sha256 -hmac "$API_KEY_SALT" | awk '{print $2}')

# 创建 .env 文件
cat > .env << EOF
# Server Configuration
HOST=0.0.0.0
PORT=3000

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=15m

# CORS Configuration
ALLOWED_ORIGINS=*

# SoftHSM Configuration
SOFTHSM_MODULE=/usr/local/lib/softhsm/libsofthsm2.so
HSM_TOKEN_LABEL=wallet-custody
HSM_PIN=${USER_PIN}

# API Key Configuration
API_KEY_SALT=${API_KEY_SALT}
VALID_API_KEYS=${API_KEY_HASH}

# Audit Configuration
AUDIT_ENABLED=true
AUDIT_LOG_PATH=./logs/audit.log

# Logging
LOG_LEVEL=info
EOF

echo -e "${GREEN}✅ Environment configuration created${NC}"

# 创建安全凭据文件
cat > credentials.txt << EOF
========================================
🔐 SIGNING SERVICE CREDENTIALS
========================================

⚠️  KEEP THIS FILE SECURE AND DELETE AFTER SAVING TO PASSWORD MANAGER

SoftHSM SO PIN (Admin):
${SO_PIN}

SoftHSM User PIN:
${USER_PIN}

JWT Secret:
${JWT_SECRET}

API Key Salt:
${API_KEY_SALT}

========================================
TEST API CREDENTIALS
========================================

API Key:
${TEST_API_KEY}

API Secret:
${TEST_SECRET}

API Key Hash (already configured):
${API_KEY_HASH}

========================================
USAGE
========================================

1. Login to get JWT token:
curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "${TEST_API_KEY}",
    "secret": "${TEST_SECRET}"
  }'

2. Use the returned token for signing requests

========================================
EOF

chmod 600 credentials.txt

echo -e "${GREEN}✅ Credentials saved to credentials.txt${NC}"
echo -e "${YELLOW}⚠️  Please save credentials.txt to a secure location and delete it!${NC}"

# 安装依赖
echo "Installing dependencies..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

pnpm install

echo -e "${GREEN}✅ Dependencies installed${NC}"

# 构建项目
echo "Building project..."
pnpm build

echo -e "${GREEN}✅ Project built successfully${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review credentials.txt and save them securely"
echo "2. Start the service: pnpm start"
echo "3. Test the health endpoint: curl http://localhost:3000/health"
echo ""
echo -e "${YELLOW}⚠️  Remember to delete credentials.txt after saving!${NC}"
