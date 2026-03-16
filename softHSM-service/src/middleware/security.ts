import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { ethers } from 'ethers';

// 安全配置
const SECURITY_CONFIG = {
  // IP 白名单（空数组表示不限制）
  ipWhitelist: process.env.IP_WHITELIST?.split(',') || [],
  
  // 地址白名单（空数组表示不限制）
  addressWhitelist: process.env.ADDRESS_WHITELIST?.split(',') || [],
  
  // 地址黑名单
  addressBlacklist: process.env.ADDRESS_BLACKLIST?.split(',') || [],
  
  // 单笔交易金额限制（ETH）
  maxTransactionAmount: process.env.MAX_TRANSACTION_AMOUNT || '10',
  
  // 每日累计限额（ETH）
  dailyLimit: process.env.DAILY_LIMIT || '100',
  
  // 是否需要多重签名
  requireMultiSig: process.env.REQUIRE_MULTI_SIG === 'true',
  
  // 高额交易阈值（需要额外审批）
  highValueThreshold: process.env.HIGH_VALUE_THRESHOLD || '5',
};

// 存储请求 nonce（防重放攻击）
const usedNonces = new Set<string>();
const nonceExpiry = new Map<string, number>();

// 每日交易统计
const dailyStats = new Map<string, { amount: bigint; date: string }>();

/**
 * IP 白名单中间件
 */
export async function ipWhitelistMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (SECURITY_CONFIG.ipWhitelist.length === 0) {
    return; // 未配置白名单，跳过检查
  }

  const clientIp = request.ip;
  const forwarded = request.headers['x-forwarded-for'];
  const realIp = forwarded ? (forwarded as string).split(',')[0] : clientIp;

  if (!SECURITY_CONFIG.ipWhitelist.includes(realIp)) {
    logger.warn({ ip: realIp }, 'Request from non-whitelisted IP blocked');
    
    return reply.status(403).send({
      success: false,
      error: 'Access denied: IP not whitelisted',
    });
  }
}

/**
 * 请求签名验证中间件
 * 客户端需要用 API Secret 对请求体进行 HMAC 签名
 */
export async function requestSignatureMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const signature = request.headers['x-signature'] as string;
  const timestamp = request.headers['x-timestamp'] as string;
  const nonce = request.headers['x-nonce'] as string;

  if (!signature || !timestamp || !nonce) {
    return reply.status(401).send({
      success: false,
      error: 'Missing signature headers',
    });
  }

  // 检查时间戳（防止重放攻击）
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  const timeDiff = Math.abs(now - requestTime);

  if (timeDiff > 5 * 60 * 1000) {
    // 5分钟过期
    return reply.status(401).send({
      success: false,
      error: 'Request expired',
    });
  }

  // 检查 nonce（防止重放攻击）
  const nonceKey = `${nonce}-${timestamp}`;
  if (usedNonces.has(nonceKey)) {
    logger.warn({ nonce, timestamp }, 'Replay attack detected');
    
    return reply.status(401).send({
      success: false,
      error: 'Nonce already used (replay attack)',
    });
  }

  // 验证签名
  const payload = JSON.stringify(request.body) + timestamp + nonce;
  const apiSecret = process.env.API_KEY_SALT || ''; // 实际应该从数据库查询
  const expectedSignature = crypto
    .createHmac('sha256', apiSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn({ nonce }, 'Invalid request signature');
    
    return reply.status(401).send({
      success: false,
      error: 'Invalid signature',
    });
  }

  // 记录已使用的 nonce
  usedNonces.add(nonceKey);
  nonceExpiry.set(nonceKey, now + 10 * 60 * 1000); // 10分钟后清理

  // 清理过期的 nonce
  for (const [key, expiry] of nonceExpiry.entries()) {
    if (expiry < now) {
      usedNonces.delete(key);
      nonceExpiry.delete(key);
    }
  }
}

/**
 * 交易安全检查中间件
 */
export async function transactionSecurityMiddleware(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { to, value, chainId } = request.body;

  // 1. 检查地址黑名单
  if (SECURITY_CONFIG.addressBlacklist.includes(to.toLowerCase())) {
    logger.warn({ to, requestId: request.id }, 'Transaction to blacklisted address blocked');
    
    return reply.status(403).send({
      success: false,
      error: 'Destination address is blacklisted',
    });
  }

  // 2. 检查地址白名单（如果配置了）
  if (
    SECURITY_CONFIG.addressWhitelist.length > 0 &&
    !SECURITY_CONFIG.addressWhitelist.includes(to.toLowerCase())
  ) {
    logger.warn({ to, requestId: request.id }, 'Transaction to non-whitelisted address blocked');
    
    return reply.status(403).send({
      success: false,
      error: 'Destination address is not whitelisted',
    });
  }

  // 3. 检查交易金额
  const valueInEth = value ? ethers.formatEther(value) : '0';
  const maxAmount = parseFloat(SECURITY_CONFIG.maxTransactionAmount);

  if (parseFloat(valueInEth) > maxAmount) {
    logger.warn(
      { to, value: valueInEth, maxAmount, requestId: request.id },
      'Transaction exceeds maximum amount'
    );
    
    return reply.status(403).send({
      success: false,
      error: `Transaction amount ${valueInEth} ETH exceeds maximum ${maxAmount} ETH`,
    });
  }

  // 4. 检查每日限额
  const user = (request.user as any)?.userId || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  const userKey = `${user}-${today}`;

  let stats = dailyStats.get(userKey);
  if (!stats || stats.date !== today) {
    stats = { amount: 0n, date: today };
    dailyStats.set(userKey, stats);
  }

  const newTotal = stats.amount + BigInt(value || '0');
  const dailyLimitWei = ethers.parseEther(SECURITY_CONFIG.dailyLimit);

  if (newTotal > dailyLimitWei) {
    const usedToday = ethers.formatEther(stats.amount);
    const dailyLimit = SECURITY_CONFIG.dailyLimit;
    
    logger.warn(
      { user, usedToday, dailyLimit, requestId: request.id },
      'Daily limit exceeded'
    );
    
    return reply.status(403).send({
      success: false,
      error: `Daily limit exceeded. Used: ${usedToday} ETH, Limit: ${dailyLimit} ETH`,
    });
  }

  // 5. 高额交易告警（可以接入 Telegram/Email 通知）
  const highValueThreshold = parseFloat(SECURITY_CONFIG.highValueThreshold);
  if (parseFloat(valueInEth) > highValueThreshold) {
    logger.warn(
      { to, value: valueInEth, threshold: highValueThreshold, requestId: request.id },
      '⚠️ HIGH VALUE TRANSACTION DETECTED - Manual review recommended'
    );

    // 如果启用了多重签名要求
    if (SECURITY_CONFIG.requireMultiSig) {
      return reply.status(403).send({
        success: false,
        error: `High value transaction (${valueInEth} ETH) requires manual approval`,
        approvalRequired: true,
      });
    }
  }

  // 更新每日统计
  stats.amount = newTotal;
}

/**
 * 签名后更新统计
 */
export function updateDailyStats(user: string, value: string) {
  const today = new Date().toISOString().split('T')[0];
  const userKey = `${user}-${today}`;

  let stats = dailyStats.get(userKey);
  if (!stats || stats.date !== today) {
    stats = { amount: 0n, date: today };
    dailyStats.set(userKey, stats);
  }

  stats.amount += BigInt(value || '0');
}

/**
 * 清理过期数据
 */
setInterval(() => {
  const now = Date.now();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 清理过期的每日统计
  for (const [key, stats] of dailyStats.entries()) {
    if (stats.date < yesterday) {
      dailyStats.delete(key);
    }
  }

  logger.info('Security middleware: cleaned up expired data');
}, 60 * 60 * 1000); // 每小时清理一次
