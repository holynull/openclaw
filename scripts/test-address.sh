#!/bin/bash

# 从容器环境变量获取凭据
JWT_TOKEN=$(curl -s -X POST http://softhsm-service:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"${SOFTHSM_API_KEY}\",\"secret\":\"${SOFTHSM_API_SECRET}\"}" \
  | grep -o '"token":"[^"]*"' | sed 's/.*"token":"\([^"]*\)".*/\1/')

echo "============================================"
echo "SoftHSM Address Retrieval Test"
echo "============================================"
echo ""
echo "JWT Token obtained: ${JWT_TOKEN:0:30}..."
echo ""

for i in 0 1 2; do
  echo "--- Account $i ---"
  curl -s -X GET "http://softhsm-service:3000/api/sign/address/ethereum/$i" \
    -H "Authorization: Bearer ${JWT_TOKEN}"
  echo ""
  echo ""
done

echo "============================================"
