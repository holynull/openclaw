#!/bin/sh
#
# Docker Entrypoint for SoftHSM Service
# 自动初始化 HSM token 然后启动服务
#

set -e

# 执行 HSM token 初始化检查
if [ -f /app/scripts/init-hsm.sh ]; then
    sh /app/scripts/init-hsm.sh
fi

# 启动服务
exec "$@"
