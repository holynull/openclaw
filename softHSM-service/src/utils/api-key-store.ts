/**
 * API Key/Secret 存储
 * 用于签名验证时查找对应的 secret
 */

import crypto from 'crypto';

interface ApiKeyInfo {
  apiKey: string;
  apiSecret: string;
  hash: string; // 用于登录验证的 hash
}

class ApiKeyStore {
  private store: Map<string, ApiKeyInfo> = new Map();

  /**
   * 初始化 API Key Store
   * 从环境变量读取配置：API_KEY_PAIRS=ak_xxx:as_yyy,ak_aaa:as_bbb
   */
  initialize() {
    const apiKeyPairs = process.env.API_KEY_PAIRS;
    if (apiKeyPairs) {
      const pairs = apiKeyPairs.split(',');
      for (const pair of pairs) {
        const [apiKey, apiSecret] = pair.trim().split(':');
        if (apiKey && apiSecret) {
          this.addKey(apiKey, apiSecret);
        }
      }
    }

    // 兼容旧的单一 API Key 配置
    const legacyApiKey = process.env.SOFTHSM_API_KEY;
    const legacyApiSecret = process.env.SOFTHSM_API_SECRET;
    if (legacyApiKey && legacyApiSecret) {
      this.addKey(legacyApiKey, legacyApiSecret);
    }

    console.log(`[ApiKeyStore] Initialized with ${this.store.size} API key(s)`);
  }

  /**
   * 添加 API Key/Secret 对
   */
  addKey(apiKey: string, apiSecret: string) {
    const salt = process.env.API_KEY_SALT || '';
    
    // 计算 hash（用于登录验证）
    const hash = crypto
      .createHmac('sha256', salt)
      .update(apiKey + apiSecret)
      .digest('hex');

    this.store.set(apiKey, {
      apiKey,
      apiSecret,
      hash,
    });
  }

  /**
   * 根据 apiKey 获取 secret
   */
  getSecret(apiKey: string): string | null {
    const info = this.store.get(apiKey);
    return info?.apiSecret || null;
  }

  /**
   * 根据 apiKey 获取完整信息
   */
  getKeyInfo(apiKey: string): ApiKeyInfo | null {
    return this.store.get(apiKey) || null;
  }

  /**
   * 验证 hash（用于登录）
   */
  isValidHash(hash: string): boolean {
    for (const info of this.store.values()) {
      if (info.hash === hash) {
        return true;
      }
    }
    return false;
  }
}

// 单例
export const apiKeyStore = new ApiKeyStore();
