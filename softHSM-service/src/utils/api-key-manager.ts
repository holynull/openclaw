import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * API Key 管理系统
 * 支持密钥轮换、撤销、权限管理
 */

interface ApiKeyInfo {
  id: string;
  key: string;
  secret: string;
  hashedKey: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  permissions: string[];
  rateLimits: {
    maxRequestsPerMinute: number;
    maxTransactionAmount: string;
    dailyLimit: string;
  };
  isActive: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}

// 模拟数据库（实际应该用 PostgreSQL/MongoDB）
const apiKeys = new Map<string, ApiKeyInfo>();

/**
 * 生成新的 API Key
 */
export function generateApiKey(options: {
  permissions?: string[];
  expiresInDays?: number;
  maxRequestsPerMinute?: number;
  maxTransactionAmount?: string;
  dailyLimit?: string;
}): { apiKey: string; apiSecret: string; id: string } {
  const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
  const apiSecret = 'as_' + crypto.randomBytes(32).toString('hex');
  const id = crypto.randomUUID();

  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey + apiSecret)
    .digest('hex');

  const keyInfo: ApiKeyInfo = {
    id,
    key: apiKey,
    secret: apiSecret,
    hashedKey,
    createdAt: new Date(),
    expiresAt: options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined,
    permissions: options.permissions || ['sign:ethereum', 'get:address'],
    rateLimits: {
      maxRequestsPerMinute: options.maxRequestsPerMinute || 10,
      maxTransactionAmount: options.maxTransactionAmount || '10',
      dailyLimit: options.dailyLimit || '100',
    },
    isActive: true,
  };

  apiKeys.set(hashedKey, keyInfo);

  logger.info({ id, permissions: keyInfo.permissions }, 'New API key generated');

  return { apiKey, apiSecret, id };
}

/**
 * 验证 API Key
 */
export function validateApiKey(
  apiKey: string,
  apiSecret: string
): { valid: boolean; keyInfo?: ApiKeyInfo; reason?: string } {
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey + apiSecret)
    .digest('hex');

  const keyInfo = apiKeys.get(hashedKey);

  if (!keyInfo) {
    return { valid: false, reason: 'Invalid API key' };
  }

  if (!keyInfo.isActive) {
    return { valid: false, reason: 'API key has been revoked', keyInfo };
  }

  if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
    return { valid: false, reason: 'API key has expired', keyInfo };
  }

  // 更新最后使用时间
  keyInfo.lastUsedAt = new Date();

  return { valid: true, keyInfo };
}

/**
 * 撤销 API Key
 */
export function revokeApiKey(id: string, reason: string): boolean {
  for (const [hash, keyInfo] of apiKeys.entries()) {
    if (keyInfo.id === id) {
      keyInfo.isActive = false;
      keyInfo.revokedAt = new Date();
      keyInfo.revokedReason = reason;

      logger.warn({ id, reason }, 'API key revoked');
      return true;
    }
  }

  return false;
}

/**
 * 轮换 API Key（生成新的，保留旧的一段时间）
 */
export function rotateApiKey(
  oldApiKey: string,
  oldApiSecret: string,
  gracePeriodDays: number = 7
): { newApiKey: string; newApiSecret: string; id: string } | null {
  const oldHashedKey = crypto
    .createHash('sha256')
    .update(oldApiKey + oldApiSecret)
    .digest('hex');

  const oldKeyInfo = apiKeys.get(oldHashedKey);
  if (!oldKeyInfo) {
    return null;
  }

  // 生成新密钥（继承权限）
  const newKey = generateApiKey({
    permissions: oldKeyInfo.permissions,
    maxRequestsPerMinute: oldKeyInfo.rateLimits.maxRequestsPerMinute,
    maxTransactionAmount: oldKeyInfo.rateLimits.maxTransactionAmount,
    dailyLimit: oldKeyInfo.rateLimits.dailyLimit,
  });

  // 设置旧密钥的过期时间（宽限期）
  oldKeyInfo.expiresAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);

  logger.info(
    { oldId: oldKeyInfo.id, newId: newKey.id, gracePeriodDays },
    'API key rotated'
  );

  return newKey;
}

/**
 * 列出所有 API Keys
 */
export function listApiKeys(): Array<{
  id: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  permissions: string[];
}> {
  return Array.from(apiKeys.values()).map((k) => ({
    id: k.id,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt,
    lastUsedAt: k.lastUsedAt,
    isActive: k.isActive,
    permissions: k.permissions,
  }));
}

/**
 * 检查权限
 */
export function hasPermission(keyInfo: ApiKeyInfo, permission: string): boolean {
  return keyInfo.permissions.includes(permission) || keyInfo.permissions.includes('*');
}

/**
 * 获取 API Key 的速率限制
 */
export function getRateLimits(keyInfo: ApiKeyInfo) {
  return keyInfo.rateLimits;
}
