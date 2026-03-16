import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

/**
 * 签名服务客户端（带请求签名验证）
 * 
 * 用于从你的应用调用签名服务
 */
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
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器：自动添加签名
    this.client.interceptors.request.use(
      (config) => {
        // 对 POST/PUT/PATCH 请求添加签名
        if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
          const { signature, timestamp, nonce } = this.signRequest(config.data);
          config.headers['X-Signature'] = signature;
          config.headers['X-Timestamp'] = timestamp;
          config.headers['X-Nonce'] = nonce;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器：自动处理 token 过期
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          await this.login();
          error.config.headers['Authorization'] = `Bearer ${this.token}`;
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 对请求进行签名（防篡改、防重放）
   */
  private signRequest(body: any): { signature: string; timestamp: string; nonce: string } {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // 计算 HMAC-SHA256 签名
    const payload = JSON.stringify(body) + timestamp + nonce;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
    
    return { signature, timestamp, nonce };
  }

  /**
   * 登录获取 JWT Token
   */
  async login(): Promise<void> {
    try {
      const response = await this.client.post('/auth/login', {
        apiKey: this.apiKey,
        secret: this.apiSecret,
      });

      this.token = response.data.data.token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * 签名以太坊交易
   */
  async signEthereumTransaction(params: {
    chainId: number;
    to: string;
    value: string;
    gasLimit: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasPrice?: string;
    nonce: number;
    data?: string;
    accountIndex?: number;
  }): Promise<{
    signedTransaction: string;
    transactionHash: string;
    from: string;
    signatureId: string;
  }> {
    if (!this.token) {
      await this.login();
    }

    try {
      const response = await this.client.post('/api/sign/ethereum', params);
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Signing failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * 获取地址
   */
  async getAddress(chain: string, accountIndex: number = 0): Promise<string> {
    if (!this.token) {
      await this.login();
    }

    try {
      const response = await this.client.get(`/api/sign/address/${chain}/${accountIndex}`);
      return response.data.data.address;
    } catch (error: any) {
      throw new Error(`Get address failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health/ready');
      return response.data.status === 'ready';
    } catch {
      return false;
    }
  }
}

// ==================== 使用示例 ====================

async function basicExample() {
  console.log('=== 基础示例 ===\n');
  
  // 初始化客户端
  const client = new SigningServiceClient(
    'http://localhost:3000',
    'your-api-key',
    'your-api-secret'
  );

  // 检查服务健康状态
  const isHealthy = await client.healthCheck();
  console.log('✅ Service healthy:', isHealthy);

  // 获取地址
  const address = await client.getAddress('ethereum', 0);
  console.log('✅ Address:', address);

  // 签名交易
  const result = await client.signEthereumTransaction({
    chainId: 137,
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000', // 1 ETH in wei
    gasLimit: '21000',
    maxFeePerGas: '30000000000',
    maxPriorityFeePerGas: '2000000000',
    nonce: 0,
    accountIndex: 0,
  });

  console.log('✅ Signed transaction:', result.signedTransaction);
  console.log('✅ Transaction hash:', result.transactionHash);
  console.log('✅ From address:', result.from);
  console.log('✅ Signature ID:', result.signatureId);
}

async function securityExample() {
  console.log('\n=== 安全特性演示 ===\n');
  
  const client = new SigningServiceClient(
    'http://localhost:3000',
    'your-api-key',
    'your-api-secret'
  );

  // 场景 1: 正常交易（会成功）
  console.log('场景 1: 正常小额交易');
  try {
    const result = await client.signEthereumTransaction({
      chainId: 137,
      to: '0x1234567890123456789012345678901234567890',
      value: '100000000000000000', // 0.1 ETH
      gasLimit: '21000',
      maxFeePerGas: '30000000000',
      maxPriorityFeePerGas: '2000000000',
      nonce: 0,
    });
    console.log('✅ 交易成功，签名 ID:', result.signatureId);
  } catch (error: any) {
    console.error('❌ 交易失败:', error.response?.data?.error || error.message);
  }

  // 场景 2: 金额超限（会被拒绝）
  console.log('\n场景 2: 金额超限交易（假设限制是 10 ETH）');
  try {
    const result = await client.signEthereumTransaction({
      chainId: 137,
      to: '0x1234567890123456789012345678901234567890',
      value: '15000000000000000000', // 15 ETH，超过限制
      gasLimit: '21000',
      maxFeePerGas: '30000000000',
      maxPriorityFeePerGas: '2000000000',
      nonce: 0,
    });
    console.log('✅ 交易成功（不应该发生）');
  } catch (error: any) {
    console.error('❌ 预期的拒绝:', error.response?.data?.error || error.message);
  }

  // 场景 3: 黑名单地址（会被拒绝）
  console.log('\n场景 3: 向黑名单地址转账');
  try {
    const result = await client.signEthereumTransaction({
      chainId: 137,
      to: '0x0000000000000000000000000000000000000001', // 假设在黑名单中
      value: '100000000000000000', // 0.1 ETH
      gasLimit: '21000',
      maxFeePerGas: '30000000000',
      maxPriorityFeePerGas: '2000000000',
      nonce: 0,
    });
    console.log('✅ 交易成功（不应该发生）');
  } catch (error: any) {
    console.error('❌ 预期的拒绝:', error.response?.data?.error || error.message);
  }
}

async function integrationExample() {
  console.log('\n=== 与 Telegram Bot 集成示例 ===\n');
  
  const client = new SigningServiceClient(
    process.env.SIGNING_SERVICE_URL || 'http://localhost:3000',
    process.env.SIGNING_API_KEY || 'your-api-key',
    process.env.SIGNING_API_SECRET || 'your-api-secret'
  );

  // 模拟 Telegram Bot 收到转账请求
  async function handleTransferRequest(userId: string, to: string, amount: string) {
    console.log(`📱 用户 ${userId} 请求转账 ${amount} ETH 到 ${to}`);
    
    try {
      // 1. 获取用户的地址（accountIndex 可以根据 userId 映射）
      const fromAddress = await client.getAddress('ethereum', 0);
      console.log(`📍 从地址: ${fromAddress}`);
      
      // 2. 获取 nonce（省略实际的链查询）
      const nonce = 0; // 实际应该查询链上 nonce
      
      // 3. 调用签名服务
      const result = await client.signEthereumTransaction({
        chainId: 137, // Polygon
        to,
        value: (parseFloat(amount) * 1e18).toString(),
        gasLimit: '21000',
        maxFeePerGas: '30000000000',
        maxPriorityFeePerGas: '2000000000',
        nonce,
      });
      
      console.log('✅ 签名成功！');
      console.log(`📝 交易哈希: ${result.transactionHash}`);
      console.log(`🔐 签名 ID: ${result.signatureId}`);
      
      // 4. 广播交易（省略实际的广播）
      console.log('📡 正在广播交易到区块链...');
      
      // 5. 通知用户
      console.log(`💬 回复用户: "转账成功！交易哈希: ${result.transactionHash}"`);
      
      return result;
    } catch (error: any) {
      console.error('❌ 转账失败:', error.response?.data?.error || error.message);
      console.log(`💬 回复用户: "转账失败: ${error.response?.data?.error || '系统错误'}"`);
      throw error;
    }
  }

  // 模拟处理转账请求
  await handleTransferRequest(
    'telegram_user_123',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    '0.5'
  );
}

// 取消注释以运行示例
// basicExample().catch(console.error);
// securityExample().catch(console.error);
// integrationExample().catch(console.error);

export { basicExample, securityExample, integrationExample };
