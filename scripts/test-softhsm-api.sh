#!/bin/bash

# SoftHSM Service API 测试脚本
# 从 gateway-2 容器内测试 softhsm-service 的所有接口

set -e

BASE_URL="http://softhsm-service:3000"
API_KEY="${SOFTHSM_API_KEY}"
API_SECRET="${SOFTHSM_API_SECRET}"

echo "========================================"
echo "SoftHSM Service API 完整测试"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:20}..."
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local headers="$5"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${YELLOW}[$TOTAL_TESTS] 测试: $name${NC}"
  echo "   $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" $headers)
  else
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      $headers \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "   ${GREEN}✓ PASSED${NC} (HTTP $http_code)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "   ${RED}✗ FAILED${NC} (HTTP $http_code)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  
  echo "   Response:"
  echo "$body" | head -c 500
  echo ""
  echo ""
}

# ===========================================
# 1. 健康检查接口
# ===========================================
echo "=========================================="
echo "1. 健康检查接口"
echo "=========================================="

test_endpoint \
  "基本健康检查" \
  "GET" \
  "/health" \
  "" \
  ""

test_endpoint \
  "就绪检查 (含HSM状态)" \
  "GET" \
  "/health/ready" \
  "" \
  ""

test_endpoint \
  "存活检查" \
  "GET" \
  "/health/live" \
  "" \
  ""

# ===========================================
# 2. 认证接口
# ===========================================
echo "=========================================="
echo "2. 认证接口"
echo "=========================================="

# 登录获取 JWT Token
LOGIN_DATA="{\"apiKey\":\"$API_KEY\",\"secret\":\"$API_SECRET\"}"

test_endpoint \
  "登录获取JWT Token" \
  "POST" \
  "/auth/login" \
  "$LOGIN_DATA" \
  ""

# 提取 JWT Token
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}错误: 无法获取 JWT Token，后续测试将失败${NC}"
  JWT_TOKEN="invalid_token"
else
  echo -e "${GREEN}成功获取 JWT Token: ${JWT_TOKEN:0:30}...${NC}"
fi

echo ""

# 测试刷新 Token
test_endpoint \
  "刷新JWT Token" \
  "POST" \
  "/auth/refresh" \
  "{}" \
  "-H \"Authorization: Bearer $JWT_TOKEN\""

# ===========================================
# 3. 签名接口
# ===========================================
echo "=========================================="
echo "3. 签名接口"
echo "=========================================="

# 获取以太坊地址
test_endpoint \
  "获取以太坊地址 (账户0)" \
  "GET" \
  "/api/sign/address/ethereum/0" \
  "" \
  "-H \"Authorization: Bearer $JWT_TOKEN\""

test_endpoint \
  "获取以太坊地址 (账户1)" \
  "GET" \
  "/api/sign/address/ethereum/1" \
  "" \
  "-H \"Authorization: Bearer $JWT_TOKEN\""

# 签名以太坊交易（EIP-1559）
ETH_SIGN_DATA='{
  "chainId": 137,
  "to": "0x0000000000000000000000000000000000000001",
  "value": "1000000000000000",
  "gasLimit": "21000",
  "maxFeePerGas": "30000000000",
  "maxPriorityFeePerGas": "2000000000",
  "nonce": 0,
  "accountIndex": 0
}'

test_endpoint \
  "签名以太坊交易 (EIP-1559)" \
  "POST" \
  "/api/sign/ethereum" \
  "$ETH_SIGN_DATA" \
  "-H \"Authorization: Bearer $JWT_TOKEN\""

# 签名以太坊交易（Legacy）
ETH_SIGN_LEGACY_DATA='{
  "chainId": 137,
  "to": "0x0000000000000000000000000000000000000001",
  "value": "1000000000000000",
  "gasLimit": "21000",
  "gasPrice": "30000000000",
  "nonce": 0,
  "accountIndex": 0
}'

test_endpoint \
  "签名以太坊交易 (Legacy)" \
  "POST" \
  "/api/sign/ethereum" \
  "$ETH_SIGN_LEGACY_DATA" \
  "-H \"Authorization: Bearer $JWT_TOKEN\""

# ===========================================
# 4. 错误测试（可选）
# ===========================================
echo "=========================================="
echo "4. 错误处理测试"
echo "=========================================="

# 测试无效的 API Key
test_endpoint \
  "登录失败 (无效凭据)" \
  "POST" \
  "/auth/login" \
  '{"apiKey":"invalid_key_12345678901234567890","secret":"invalid_secret_12345678901234567890"}' \
  ""

# 测试无 Token 访问
test_endpoint \
  "获取地址失败 (缺少Token)" \
  "GET" \
  "/api/sign/address/ethereum/0" \
  "" \
  ""

# 测试无效的 Token
test_endpoint \
  "获取地址失败 (无效Token)" \
  "GET" \
  "/api/sign/address/ethereum/0" \
  "" \
  "-H \"Authorization: Bearer invalid_token_xyz\""

# ===========================================
# 测试总结
# ===========================================
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo -e "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}所有测试通过！✓${NC}"
  exit 0
else
  echo -e "${RED}有测试失败！请检查日志${NC}"
  exit 1
fi
