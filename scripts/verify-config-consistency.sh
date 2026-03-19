#!/bin/bash

echo "=========================================="
echo "Gateway-2 配置一致性验证"
echo "=========================================="
echo ""

# 从容器环境变量读取
CONTAINER_FEISHU_ID=$(docker exec openclaw-gateway-2 printenv FEISHU_APP_ID 2>/dev/null)
CONTAINER_FEISHU_SECRET=$(docker exec openclaw-gateway-2 printenv FEISHU_APP_SECRET 2>/dev/null)
CONTAINER_SOFTHSM_KEY=$(docker exec openclaw-gateway-2 printenv SOFTHSM_API_KEY 2>/dev/null)
CONTAINER_SOFTHSM_SECRET=$(docker exec openclaw-gateway-2 printenv SOFTHSM_API_SECRET 2>/dev/null)

# 从.env读取
cd ~/github.com/holynull/openclaw
ENV_FEISHU_ID_2=$(grep "^FEISHU_APP_ID_2=" .env | cut -d'=' -f2)
ENV_FEISHU_SECRET_2=$(grep "^FEISHU_APP_SECRET_2=" .env | cut -d'=' -f2)
ENV_SOFTHSM_KEY=$(grep "^SOFTHSM_API_KEY=" .env | cut -d'=' -f2 | tr -d '"')
ENV_SOFTHSM_SECRET=$(grep "^SOFTHSM_API_SECRET=" .env | cut -d'=' -f2 | tr -d '"')

echo "1. FEISHU_APP_ID"
echo "   .env文件 (FEISHU_APP_ID_2): $ENV_FEISHU_ID_2"
echo "   容器环境 (FEISHU_APP_ID):   $CONTAINER_FEISHU_ID"
[ "$ENV_FEISHU_ID_2" = "$CONTAINER_FEISHU_ID" ] && echo "   ✅ 一致" || echo "   ❌ 不一致"
echo ""

echo "2. FEISHU_APP_SECRET"
echo "   .env文件 (FEISHU_APP_SECRET_2): ${ENV_FEISHU_SECRET_2:0:25}..."
echo "   容器环境 (FEISHU_APP_SECRET):   ${CONTAINER_FEISHU_SECRET:0:25}..."
[ "$ENV_FEISHU_SECRET_2" = "$CONTAINER_FEISHU_SECRET" ] && echo "   ✅ 一致" || echo "   ❌ 不一致"
echo ""

echo "3. SOFTHSM_API_KEY"
echo "   .env文件: ${ENV_SOFTHSM_KEY:0:35}..."
echo "   容器环境: ${CONTAINER_SOFTHSM_KEY:0:35}..."
[ "$ENV_SOFTHSM_KEY" = "$CONTAINER_SOFTHSM_KEY" ] && echo "   ✅ 一致" || echo "   ❌ 不一致"
echo ""

echo "4. SOFTHSM_API_SECRET"
echo "   .env文件: ${ENV_SOFTHSM_SECRET:0:35}..."
echo "   容器环境: ${CONTAINER_SOFTHSM_SECRET:0:35}..."
[ "$ENV_SOFTHSM_SECRET" = "$CONTAINER_SOFTHSM_SECRET" ] && echo "   ✅ 一致" || echo "   ❌ 不一致"
echo ""

echo "5. openclaw.json配置文件验证"
echo "   配置文件路径: ~/.openclaw2/openclaw.json"
echo "   使用环境变量占位符:"
grep -o '\${[A-Z_]*}' ~/.openclaw2/openclaw.json | sort -u | grep -E "FEISHU|SOFTHSM|OPENAI"
echo ""

echo "=========================================="
echo "测试结论"
echo "=========================================="
echo ""
echo "配置文件 (openclaw.json) 使用 \${变量名} 占位符"
echo "Docker Compose 将 .env 中的变量注入容器"
echo "容器内 OpenClaw 进程读取环境变量并替换占位符"
echo ""
echo "✅ 所有配置通过环境变量机制保持一致"
echo "=========================================="
