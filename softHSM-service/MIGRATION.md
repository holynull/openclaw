# 🔄 迁移指南：从环境变量到签名服务

## 现状分析

### 当前架构问题

```typescript
// ❌ 当前实现（环境变量存储助记词）
async function derivePrivateKey(wallet: any, derivationPath: string) {
  const mnemonic = process.env.WALLET_MNEMONIC;  // 明文存储
  const result = await wallet.getDerivedPrivateKey({
    mnemonic,
    hdPath: derivationPath,
  });
  return result;  // 私钥在内存中
}
```

**风险**：
- ❌ 助记词明文存储在环境变量
- ❌ 私钥在应用进程内存中流转
- ❌ 容器/进程可被 dump 获取密钥
- ❌ 无访问控制和审计

### 目标架构

```
Telegram Bot → 调用 API → 签名服务 → SoftHSM → 签名
                                    ↓
                                审计日志
```

**优势**：
- ✅ 私钥隔离在 HSM 中
- ✅ API 认证和授权
- ✅ 完整审计日志
- ✅ 符合安全标准

---

## 迁移步骤

### 阶段 1：部署签名服务（无中断）

#### 1.1 设置签名服务

```bash
cd extensions/wallet-manager/softHSM-service

# 运行自动化设置脚本
chmod +x setup.sh
./setup.sh

# 这会：
# ✅ 安装 SoftHSM
# ✅ 初始化 Token
# ✅ 生成配置和凭据
# ✅ 安装依赖并构建
```

#### 1.2 启动服务

```bash
# 开发模式
pnpm dev

# 或生产模式
pnpm start

# 或使用 Docker
docker-compose up -d
```

#### 1.3 验证服务

```bash
# 健康检查
curl http://localhost:3000/health/ready

# 预期输出：
# {"status":"ready","hsm":"ok","timestamp":"2026-03-13T..."}
```

---

### 阶段 2：迁移现有助记词到 HSM（一次性）

#### 2.1 创建迁移脚本

创建 `extensions/wallet-manager/softHSM-service/migration/import-mnemonic.ts`:

```typescript
import { EthWallet } from "@okxweb3/coin-ethereum";
import * as pkcs11 from 'graphene-pk11';
import { config } from '../src/config.js';

async function migrateMnemonicToHSM() {
  // 1. 从环境变量读取助记词（最后一次）
  const mnemonic = process.env.WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error('WALLET_MNEMONIC not set');
  }

  // 2. 连接 HSM
  const module = pkcs11.Module.load(config.hsm.modulePath);
  module.initialize();

  const slots = module.getSlots(true);
  let targetSlot: pkcs11.Slot | null = null;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots.items(i);
    const token = slot.getToken();
    if (token.label.trim() === config.hsm.tokenLabel) {
      targetSlot = slot;
      break;
    }
  }

  if (!targetSlot) {
    throw new Error('Token not found');
  }

  const session = targetSlot.open(
    pkcs11.SessionFlag.SERIAL_SESSION | pkcs11.SessionFlag.RW_SESSION
  );
  session.login(config.hsm.pin, pkcs11.UserType.USER);

  console.log('✅ Connected to HSM');

  // 3. 派生并导入多个账户的私钥
  const wallet = new EthWallet();
  const accountsToImport = 10; // 导入前10个账户

  for (let i = 0; i < accountsToImport; i++) {
    const derivationPath = `m/44'/60'/0'/0/${i}`;
    
    // 从助记词派生私钥
    const privateKeyHex = await wallet.getDerivedPrivateKey({
      mnemonic,
      hdPath: derivationPath,
    });

    const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
    const keyLabel = `eth-key-${i}`;

    // 导入私钥到 HSM
    try {
      session.createObject({
        class: pkcs11.ObjectClass.PRIVATE_KEY,
        keyType: pkcs11.KeyType.ECDSA,
        label: keyLabel,
        id: Buffer.from(keyLabel),
        token: true,
        private: true,
        sensitive: true,
        extractable: false, // 重要：私钥不可导出
        sign: true,
        value: privateKeyBuffer,
      });

      console.log(`✅ Imported account ${i}: ${keyLabel}`);
    } catch (error) {
      console.error(`❌ Failed to import account ${i}:`, error);
    }
  }

  // 4. 清理
  session.logout();
  session.close();
  module.finalize();

  console.log('\n✅ Migration completed!');
  console.log('⚠️  Next step: Remove WALLET_MNEMONIC from environment variables');
}

// 运行迁移
migrateMnemonicToHSM().catch(console.error);
```

#### 2.2 执行迁移

```bash
# 确保 WALLET_MNEMONIC 环境变量已设置
export WALLET_MNEMONIC="your twelve word mnemonic phrase here..."

# 运行迁移脚本
tsx migration/import-mnemonic.ts

# ⚠️  迁移成功后，立即从环境变量中删除助记词！
unset WALLET_MNEMONIC
```

#### 2.3 验证迁移

```bash
# 查看 HSM 中的密钥
softhsm2-util --show-slots

# 预期输出应显示已导入的密钥
```

---

### 阶段 3：修改现有代码调用签名服务

#### 3.1 安装客户端库

```bash
cd extensions/wallet-manager
pnpm add axios
```

#### 3.2 创建签名服务客户端包装器

创建 `extensions/wallet-manager/src/signing-client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

export class SigningServiceClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(
    private baseURL: string,
    private apiKey: string,
    private apiSecret: string
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
    });

    // 自动重试认证
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.login();
          error.config.headers['Authorization'] = `Bearer ${this.token}`;
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  async login() {
    const response = await this.client.post('/auth/login', {
      apiKey: this.apiKey,
      secret: this.apiSecret,
    });
    this.token = response.data.data.token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
  }

  async signTransaction(params: any) {
    if (!this.token) await this.login();
    const response = await this.client.post('/api/sign/ethereum', params);
    return response.data.data;
  }

  async getAddress(chain: string, accountIndex: number) {
    if (!this.token) await this.login();
    const response = await this.client.get(`/api/sign/address/${chain}/${accountIndex}`);
    return response.data.data.address;
  }
}

// 单例实例
let signingClient: SigningServiceClient | null = null;

export function getSigningClient(): SigningServiceClient {
  if (!signingClient) {
    const baseURL = process.env.SIGNING_SERVICE_URL || 'http://localhost:3000';
    const apiKey = process.env.SIGNING_API_KEY || '';
    const apiSecret = process.env.SIGNING_API_SECRET || '';

    if (!apiKey || !apiSecret) {
      throw new Error('SIGNING_API_KEY and SIGNING_API_SECRET must be set');
    }

    signingClient = new SigningServiceClient(baseURL, apiKey, apiSecret);
  }

  return signingClient;
}
```

#### 3.3 修改 index.ts 使用签名服务

在 `extensions/wallet-manager/index.ts` 中：

```typescript
import { getSigningClient } from './src/signing-client.js';

// ❌ 删除或注释掉旧的 derivePrivateKey 函数
/*
async function derivePrivateKey(wallet: any, derivationPath: string) {
  const mnemonic = process.env.WALLET_MNEMONIC;
  ...
}
*/

// ✅ 新实现：使用签名服务
const signingClient = getSigningClient();

// 修改 eth_get_address
api.registerTool({
  name: "eth_get_address",
  description: "Get Ethereum address...",
  parameters: Type.Object({
    accountIndex: Type.Optional(Type.Number({ description: "..." })),
  }),
  async execute(_id: any, params: any) {
    try {
      const accountIndex = params.accountIndex ?? 0;
      
      // ✅ 调用签名服务
      const address = await signingClient.getAddress('ethereum', accountIndex);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chain: "ethereum",
            address,
            accountIndex,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      console.error("Error:", error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  },
}, { optional: true });

// 修改 eth_transfer
api.registerTool({
  name: "eth_transfer",
  description: "Transfer ETH...",
  parameters: Type.Object({
    to: Type.String(),
    amount: Type.String(),
    chainId: Type.Number(),
    // ... 其他参数
  }),
  async execute(_id: any, params: any) {
    try {
      // 构建交易参数
      const provider = getProvider(params.chainId);
      const nonce = await provider.getTransactionCount(fromAddress, 'pending');
      const valueWei = ethers.parseEther(params.amount).toString();
      
      // ✅ 调用签名服务进行签名
      const result = await signingClient.signTransaction({
        chainId: params.chainId,
        to: params.to,
        value: valueWei,
        gasLimit: params.gasLimit || "21000",
        maxFeePerGas: params.maxFeePerGas,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        nonce,
        accountIndex: params.accountIndex ?? 0,
      });
      
      // 广播已签名的交易
      const tx = await provider.broadcastTransaction(result.signedTransaction);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            from: result.from,
            to: params.to,
            amount: params.amount,
            transactionHash: tx.hash,
            signatureId: result.signatureId,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      console.error("Error:", error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  },
}, { optional: true });
```

#### 3.4 更新环境变量

```bash
# 在 .env 或环境配置中添加
SIGNING_SERVICE_URL=http://localhost:3000
SIGNING_API_KEY=your-api-key-from-credentials.txt
SIGNING_API_SECRET=your-api-secret-from-credentials.txt

# ❌ 删除旧的助记词环境变量
# WALLET_MNEMONIC=... (已不需要)
```

---

### 阶段 4：测试和验证

#### 4.1 测试基本功能

```bash
# 1. 获取地址
curl http://localhost:3000/api/sign/address/ethereum/0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. 签名交易
curl -X POST http://localhost:3000/api/sign/ethereum \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 137,
    "to": "0x...",
    "value": "1000000000000000000",
    "gasLimit": "21000",
    "maxFeePerGas": "30000000000",
    "maxPriorityFeePerGas": "2000000000",
    "nonce": 0
  }'
```

#### 4.2 验证审计日志

```bash
# 查看审计日志
tail -f logs/audit.log

# 应该看到每次签名操作的记录
```

---

## 生产部署建议

### 1. 网络安全

```yaml
# docker-compose.yml
services:
  softHSM-service:
    networks:
      - private-network
    # 不直接暴露端口到外网
    # ports:
    #   - "3000:3000"

  nginx:
    networks:
      - private-network
      - public-network
    ports:
      - "443:443"

networks:
  private-network:
    internal: true
  public-network:
```

### 2. 使用 HTTPS + 证书认证

```nginx
server {
    listen 443 ssl;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 客户端证书认证
    ssl_client_certificate /path/to/ca.pem;
    ssl_verify_client on;
    
    location / {
        proxy_pass http://softHSM-service:3000;
    }
}
```

### 3. 备份策略

```bash
# 定期备份 HSM token 文件（加密）
tar czf hsm-backup-$(date +%Y%m%d).tar.gz /var/lib/softhsm-wallet
gpg --encrypt --recipient your-key hsm-backup-*.tar.gz

# 备份审计日志
rsync -av logs/ backup-server:/backups/softHSM-service/
```

### 4. 监控告警

```yaml
# Prometheus + Grafana 监控
# 关键指标：
# - 签名请求 QPS
# - 错误率
# - API 响应时间
# - HSM 可用性
```

---

## 回滚计划

如果迁移出现问题，可以快速回滚：

1. 停止签名服务
2. 恢复 `WALLET_MNEMONIC` 环境变量
3. 回退代码到旧版本
4. 重启应用

**重要**：在完全验证新系统稳定运行至少 1 周后，再永久删除助记词备份。

---

## 常见问题

### Q: SoftHSM 性能够用吗？
A: SoftHSM 可以达到 ~1000 签名/秒，对于大多数应用足够。如需更高性能，考虑硬件 HSM。

### Q: 如何处理多实例部署？
A: 需要共享 HSM token 文件（通过 NFS 或复制），或使用支持集群的硬件 HSM。

### Q: 签名服务单点故障怎么办？
A: 部署主备模式，使用心跳检测自动切换。HSM token 文件定期同步。

### Q: 审计日志如何存储？
A: 推荐发送到中心化日志系统（ELK/Loki），并启用不可篡改存储。

---

## 总结

通过这个迁移，你将获得：

✅ **更高安全性**：私钥隔离在 HSM 中  
✅ **可审计性**：所有操作完整记录  
✅ **访问控制**：API 认证和授权  
✅ **合规性**：符合行业安全标准  
✅ **灵活性**：易于扩展到硬件 HSM  

需要帮助？查看 README.md 或联系技术支持。
