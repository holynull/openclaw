import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import crypto from 'crypto';

/**
 * SoftHSM 签名服务客户端
 * 用于从OpenClaw调用SoftHSM签名服务
 */
export class SoftHSMClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: number = 0;

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

    // 请求拦截器：自动添加签名和token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // 确保有有效的token（除了login请求）
        if (!config.url?.includes('/auth/login')) {
          await this.ensureValidToken();
          config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        // 对 POST/PUT/PATCH 请求添加签名
        if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
          const { signature, timestamp, nonce } = this.signRequest(config.data);
          config.headers['X-Signature'] = signature;
          config.headers['X-Timestamp'] = timestamp;
          config.headers['X-Nonce'] = nonce;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // 响应拦截器：处理 token 过期
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError) => {
        if ((error.response?.status === 401 && !(error.config as any)?._retry)) {
          (error.config as any)._retry = true;
          await this.login();
          if (error.config) {
            error.config.headers['Authorization'] = `Bearer ${this.token}`;
            return this.client.request(error.config);
          }
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
   * 确保有有效的token
   */
  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    // 如果token不存在或即将过期（提前30秒刷新）
    if (!this.token || now >= this.tokenExpiry - 30000) {
      await this.login();
    }
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
      // JWT默认15分钟过期
      this.tokenExpiry = Date.now() + 15 * 60 * 1000;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (error: any) {
      console.error('SoftHSM login failed:', error.response?.data || error.message);
      throw new Error(`Login failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * 获取以太坊地址
   */
  async getEthereumAddress(accountIndex: number = 0): Promise<string> {
    try {
      const response = await this.client.get(`/api/sign/address/ethereum/${accountIndex}`);
      return response.data.data.address;
    } catch (error: any) {
      console.error('Get Ethereum address failed:', error.response?.data || error.message);
      throw new Error(`Get address failed: ${error.response?.data?.error || error.message}`);
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
    try {
      const response = await this.client.post('/api/sign/ethereum', params);
      return response.data.data;
    } catch (error: any) {
      console.error('Sign Ethereum transaction failed:', error.response?.data || error.message);
      throw new Error(`Signing failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health/ready');
      return response.data.status === 'ready';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
