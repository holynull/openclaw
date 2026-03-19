#!/bin/sh
#
# HSM Token 自动初始化脚本
# 在服务启动前检查并创建 token（如果不存在）
#

set -e

TOKEN_LABEL="${HSM_TOKEN_LABEL:-wallet-custody}"
HSM_PIN="${HSM_PIN:-1234}"
SO_PIN="1234"  # Security Officer PIN（用于初始化）

echo "[init-hsm] Checking HSM token status..."

# 列出所有 token
TOKENS=$(softhsm2-util --show-slots 2>/dev/null || true)

if echo "$TOKENS" | grep -q "Label:.*${TOKEN_LABEL}"; then
    echo "[init-hsm] ✓ Token '${TOKEN_LABEL}' already exists"
else
    echo "[init-hsm] ⚠ Token '${TOKEN_LABEL}' not found, initializing..."
    
    # 初始化新 token
    softhsm2-util --init-token \
        --slot 0 \
        --label "${TOKEN_LABEL}" \
        --so-pin "${SO_PIN}" \
        --pin "${HSM_PIN}"
    
    echo "[init-hsm] ✓ Token '${TOKEN_LABEL}' initialized successfully"
fi

echo "[init-hsm] HSM token ready, starting service..."
