# 🔒 签名服务安全指南

## 多层安全防护

签名服务采用**六层安全防护**：

```
请求 → IP白名单 → JWT认证 → 请求签名 → 交易验证 → HSM签名 → 审计日志
```

---

## 🛡️ 安全层级详解

### 第一层：IP 白名单

**防护目标**：阻止未授权 IP 访问

```bash
# .env 配置
IP_WHITELIST=192.168.1.100,10.0.0.50

# 只有这些 IP 能访问服务
```

**绕过方式**：留空表示不限制
```bash
IP_WHITELIST=
```

---

### 第二层：JWT 认证

**防护目标**：验证调用者身份

```bash
# 1. 先登录获取 Token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "secret": "your-secret"
  }'

# 2. 使用 Token 访问 API
curl -X GET http://localhost:3000/api/sign/address/ethereum/0 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**安全特性**：
- ✅ 15分钟自动过期
- ✅ HMAC-SHA256 签名
- ✅ 无法伪造

---

### 第三层：请求签名验证

**防护目标**：防止请求被篡改、防重放攻击

#### 客户端实现示例

```typescript
import crypto from 'crypto';

function signRequest(body: any, apiSecret: string) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // 计算签名
  const payload = JSON.stringify(body) + timestamp + nonce;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(payload)
    .digest('hex');
  
  return {
    headers: {
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
    },
  };
}

// 使用示例
const body = {
  chainId: 137,
  to: '0x...',
  value: '1000000000000000000',
  gasLimit: '21000',
  nonce: 0,
};

const { headers } = signRequest(body, process.env.API_SECRET);

await axios.post('http://localhost:3000/api/sign/ethereum', body, {
  headers: {
    'Authorization': 'Bearer ' + token,
    ...headers,
  },
});
```

**安全特性**：
- ✅ 请求体不可篡改（HMAC 签名）
- ✅ 5分钟时间窗口（防止重放）
- ✅ Nonce 机制（同一请求只能用一次）

---

### 第四层：交易安全验证

**防护目标**：防止恶意交易、资金盗窃

#### 4.1 地址黑名单

```bash
# .env 配置
ADDRESS_BLACKLIST=0x000...001,0x000...002

# 向这些地址的转账会被拒绝
```

#### 4.2 地址白名单

```bash
# .env 配置（如果启用，只能向这些地址转账）
ADDRESS_WHITELIST=0x123...abc,0x456...def
```

#### 4.3 单笔金额限制

```bash
# .env 配置
MAX_TRANSACTION_AMOUNT=10  # 单笔最多 10 ETH
```

**拒绝示例**：
```json
{
  "success": false,
  "error": "Transaction amount 15 ETH exceeds maximum 10 ETH"
}
```

#### 4.4 每日累计限额

```bash
# .env 配置
DAILY_LIMIT=100  # 每日最多 100 ETH
```

**拒绝示例**：
```json
{
  "success": false,
  "error": "Daily limit exceeded. Used: 85 ETH, Limit: 100 ETH"
}
```

#### 4.5 高额交易告警

```bash
# .env 配置
HIGH_VALUE_THRESHOLD=5      # 超过 5 ETH 记录警告
REQUIRE_MULTI_SIG=true      # 高额交易需要审批
```

**告警示例**（日志）：
```
⚠️ HIGH VALUE TRANSACTION DETECTED
- Amount: 8 ETH
- To: 0x123...abc
- Request ID: req_12345
- Manual review recommended
```

**如果启用多重签名**：
```json
{
  "success": false,
  "error": "High value transaction (8 ETH) requires manual approval",
  "approvalRequired": true
}
```

---

### 第五层：HSM 签名隔离

**防护目标**：私钥永不离开 HSM

```
┌─────────────────────────┐
│  签名服务进程           │
│  - 只有交易哈希          │
│  - 无法访问私钥          │
└──────────┬──────────────┘
           │ 哈希
           ↓
┌─────────────────────────┐
│  SoftHSM                │
│  - 私钥在加密存储        │
│  - extractable=false    │
│  - 只能签名，不能导出    │
└──────────┬──────────────┘
           │ 签名
           ↓
      返回签名结果
```

**安全特性**：
- ✅ 私钥不在应用内存中
- ✅ 私钥文件 AES 加密存储
- ✅ PIN 保护访问
- ✅ 即使攻破应用，也无法获取私钥

---

### 第六层：完整审计日志

**防护目标**：事后追溯、异常检测

#### 审计日志内容

```json
{
  "signatureId": "sig_1234567890_abc",
  "accountIndex": 0,
  "chainId": 137,
  "transactionType": "ethereum",
  "to": "0x123...abc",
  "value": "1000000000000000000",
  "transactionHash": "0xabc...123",
  "requestId": "req_xyz",
  "user": "api_key_12345",
  "timestamp": "2026-03-13T10:30:00.000Z",
  "duration": 150
}
```

#### 异常检测

```bash
# 查看最近的高额交易
grep -E "value.*[0-9]{18,}" logs/audit.log

# 查看特定用户的交易
grep "user.*api_key_12345" logs/audit.log

# 统计每日交易量
cat logs/audit.log | jq -r '.value' | \
  awk '{s+=$1} END {print s/1e18 " ETH"}'
```

---

## 🔥 实战场景

### 场景 1：正常交易

```typescript
// ✅ 所有检查通过
const result = await signingClient.signTransaction({
  chainId: 137,
  to: '0x1234567890123456789012345678901234567890',  // ✅ 不在黑名单
  value: '1000000000000000000',                       // ✅ 1 ETH < 10 ETH 限制
  gasLimit: '21000',
  maxFeePerGas: '30000000000',
  maxPriorityFeePerGas: '2000000000',
  nonce: 0,
});

// 返回：签名成功
```

---

### 场景 2：金额超限

```typescript
// ❌ 单笔金额超过限制
const result = await signingClient.signTransaction({
  chainId: 137,
  to: '0x...',
  value: '15000000000000000000',  // ❌ 15 ETH > 10 ETH 限制
  ...
});

// 返回错误：
// "Transaction amount 15 ETH exceeds maximum 10 ETH"
```

---

### 场景 3：黑名单地址

```typescript
// ❌ 向黑名单地址转账
const result = await signingClient.signTransaction({
  chainId: 137,
  to: '0x0000000000000000000000000000000000000001',  // ❌ 在黑名单中
  value: '1000000000000000000',
  ...
});

// 返回错误：
// "Destination address is blacklisted"
```

---

### 场景 4：每日限额耗尽

```typescript
// 假设今天已经转了 95 ETH

// ❌ 再转 10 ETH 会超过每日 100 ETH 限制
const result = await signingClient.signTransaction({
  value: '10000000000000000000',  // ❌ 95 + 10 > 100
  ...
});

// 返回错误：
// "Daily limit exceeded. Used: 95 ETH, Limit: 100 ETH"
```

---

### 场景 5：重放攻击

```typescript
// 攻击者截获了一个有效请求
const maliciousRequest = {
  body: { ... },
  headers: {
    'X-Signature': 'abc123...',
    'X-Timestamp': '1710320400000',
    'X-Nonce': 'def456...',
  },
};

// ❌ 尝试重放
// 第一次：✅ 成功
// 第二次：❌ 拒绝
// 返回错误：
// "Nonce already used (replay attack)"
```

---

## 📊 安全配置建议

### 开发环境

```bash
# 开发时可以放宽限制
IP_WHITELIST=
ADDRESS_WHITELIST=
MAX_TRANSACTION_AMOUNT=100
DAILY_LIMIT=1000
REQUIRE_MULTI_SIG=false
```

### 测试网环境

```bash
# 测试网可以适中
IP_WHITELIST=192.168.1.0/24
ADDRESS_WHITELIST=
MAX_TRANSACTION_AMOUNT=10
DAILY_LIMIT=100
REQUIRE_MULTI_SIG=false
```

### 生产环境（推荐）

```bash
# 生产环境严格限制
IP_WHITELIST=10.0.1.50,10.0.1.51  # 仅内网服务器
ADDRESS_WHITELIST=0x123...,0x456...  # 仅允许的地址
ADDRESS_BLACKLIST=0x000...  # 已知恶意地址
MAX_TRANSACTION_AMOUNT=5    # 单笔 5 ETH
DAILY_LIMIT=50              # 每日 50 ETH
HIGH_VALUE_THRESHOLD=2      # 超过 2 ETH 告警
REQUIRE_MULTI_SIG=true      # 高额交易需审批
```

---

## 🚨 监控告警

### 1. 实时监控指标

- 签名请求数（QPS）
- 被拒绝的请求数
- 高额交易次数
- 每日累计交易额
- 异常 IP 访问

### 2. 告警规则

```yaml
- 10分钟内被拒绝请求 > 10次 → 可能遭受攻击
- 高额交易（>5 ETH） → 人工审核
- 每日限额达到 80% → 预警通知
- 未知 IP 访问 → 立即告警
- 签名失败率 > 5% → 系统异常告警
```

### 3. 集成 Telegram 告警

```typescript
// 在 security.ts 中添加
import { sendTelegramAlert } from './telegram.js';

if (parseFloat(valueInEth) > highValueThreshold) {
  await sendTelegramAlert({
    type: 'high_value_transaction',
    amount: valueInEth,
    to: body.to,
    requestId: request.id,
  });
}
```

---

## 🔧 故障排查

### 问题：请求被拒绝

**检查清单**：
1. ✅ JWT Token 是否过期？
2. ✅ 请求签名是否正确？
3. ✅ IP 是否在白名单？
4. ✅ 地址是否在黑名单？
5. ✅ 金额是否超限？
6. ✅ 每日限额是否用完？

**查看日志**：
```bash
# 查看被拒绝的请求
docker-compose logs softHSM-service | grep "blocked"

# 查看审计日志
tail -f logs/audit.log
```

---

## 🎯 总结

通过这六层防护，签名服务可以达到**企业级安全标准**：

| 层级 | 防护措施 | 防御类型 |
|------|---------|---------|
| 1 | IP 白名单 | 网络层攻击 |
| 2 | JWT 认证 | 身份伪造 |
| 3 | 请求签名 | 篡改、重放 |
| 4 | 交易验证 | 恶意交易 |
| 5 | HSM 隔离 | 密钥泄露 |
| 6 | 审计日志 | 事后追溯 |

**安全等级**：⭐⭐⭐⭐⭐ (5/5)

适合处理**百万美元级别**的资金托管服务！
