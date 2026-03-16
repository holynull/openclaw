# 🔐 Wallet Signing Service

基于 SoftHSM + PKCS#11 的中心化签名服务架构

## 架构概述

```
客户端 → API Gateway → 签名服务 → SoftHSM → 密钥存储
```

## 功能特性

- ✅ **密钥隔离**：私钥永不离开 HSM 环境
- ✅ **API 认证**：JWT Token + API Key 双重认证
- ✅ **审计日志**：所有签名操作完整记录
- ✅ **速率限制**：防止 API 滥用
- ✅ **多链支持**：Ethereum/EVM、Bitcoin、Solana
- ✅ **高可用**：支持多实例部署

## 安全优势对比

| 特性 | 当前方案 (环境变量) | SoftHSM 签名服务 |
|------|---------------------|------------------|
| 私钥暴露风险 | ❌ 高（内存可dump） | ✅ 低（隔离在HSM） |
| 访问控制 | ❌ 无 | ✅ API认证+授权 |
| 审计日志 | ❌ 无 | ✅ 完整记录 |
| 密钥轮换 | ❌ 困难 | ✅ 支持 |
| 合规性 | ❌ 弱 | ✅ 符合行业标准 |

## 部署步骤

### 1. 安装 SoftHSM

```bash
# macOS
brew install softhsm

# Ubuntu/Debian
sudo apt-get install softhsm2

# CentOS/RHEL
sudo yum install softhsm
```

### 2. 初始化 SoftHSM Token

```bash
# 创建 token 目录
mkdir -p /var/lib/softhsm-wallet

# 配置 SoftHSM
cat > /etc/softhsm2.conf << EOF
directories.tokendir = /var/lib/softhsm-wallet
objectstore.backend = file
log.level = INFO
slots.removable = false
EOF

# 初始化 Token
softhsm2-util --init-token --slot 0 \
  --label "wallet-custody" \
  --so-pin <管理员PIN> \
  --pin <用户PIN>
```

### 3. 导入现有助记词（仅一次）

```bash
# 运行迁移脚本
node migration/import-mnemonic-to-hsm.js
```

### 4. 启动签名服务

```bash
cd softHSM-service
pnpm install
pnpm start
```

## API 使用示例

### 认证

```bash
curl -X POST https://softHSM-service.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-api-key", "secret": "your-secret"}'
```

### 签名交易

```bash
curl -X POST https://softHSM-service.example.com/api/sign/ethereum \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 137,
    "to": "0x1234...",
    "value": "100000000000000000",
    "gasLimit": "21000",
    "maxFeePerGas": "30000000000",
    "maxPriorityFeePerGas": "2000000000",
    "nonce": 0,
    "accountIndex": 0
  }'
```

### 响应

```json
{
  "success": true,
  "data": {
    "signedTransaction": "0x02f8...",
    "transactionHash": "0xabc...",
    "from": "0x5678...",
    "signatureId": "sig_1234567890"
  }
}
```

## 安全建议

### 生产环境必须做的事

1. **网络隔离**
   - 签名服务部署在私有网络
   - 仅通过反向代理暴露 HTTPS 端口
   - 使用 VPN 或专线访问

2. **访问控制**
   - 实施白名单 IP 限制
   - 使用短期 JWT Token (15分钟过期)
   - API Key 定期轮换
   - 实施多因素认证 (MFA)

3. **审计合规**
   - 所有签名操作写入审计日志
   - 日志发送到中心化日志系统
   - 异常交易告警通知
   - 定期安全审计

4. **密钥管理**
   - SoftHSM PIN 使用硬件加密存储
   - 定期备份 token 文件（加密）
   - 灾难恢复计划
   - 密钥轮换策略

5. **高可用**
   - 多实例部署（主备或负载均衡）
   - Token 文件同步机制
   - 健康检查和自动重启
   - 监控告警

### 环境变量保护

```bash
# 使用 Docker Secrets 或 Kubernetes Secrets
# 不要在代码中硬编码

SOFTHSM_PIN=<加密存储>
JWT_SECRET=<随机生成>
API_KEY_SALT=<随机生成>
```

## 性能指标

- **吞吐量**：~1000 签名/秒 (单实例)
- **延迟**：<50ms (P95)
- **并发**：支持 10K+ 连接

## 监控指标

- 签名请求数 (QPS)
- 签名成功率
- API 响应时间
- HSM 可用性
- 错误率

## 故障排查

### SoftHSM Token 不可用

```bash
# 检查 token 状态
softhsm2-util --show-slots

# 重新初始化（⚠️ 会清除所有密钥）
softhsm2-util --init-token --slot 0 --label wallet-custody
```

### API 连接超时

```bash
# 检查服务状态
systemctl status wallet-softHSM-service

# 查看日志
journalctl -u wallet-softHSM-service -f
```

## 许可证

MIT License
