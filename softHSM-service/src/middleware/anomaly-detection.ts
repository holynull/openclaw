import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';
import { sendTelegramAlert } from '../utils/telegram.js';

/**
 * 异常检测系统
 * 检测并阻止可疑行为
 */

// 存储用户行为统计
interface UserStats {
  requestCount: number;
  failedAttempts: number;
  lastRequestTime: number;
  suspiciousScore: number;
  blockUntil?: number;
}

const userStats = new Map<string, UserStats>();
const blockedUsers = new Set<string>();

// 配置
const ANOMALY_CONFIG = {
  // 请求频率限制
  maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '10', 10),
  
  // 失败尝试限制
  maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS || '5', 10),
  failedAttemptWindow: 10 * 60 * 1000, // 10分钟
  
  // 封禁时长
  blockDuration: 30 * 60 * 1000, // 30分钟
  
  // 可疑行为评分阈值
  suspiciousScoreThreshold: 100,
  
  // 异常模式
  patterns: {
    rapidRequests: 50,           // 1分钟内超过50次请求
    multipleFailures: 10,        // 短时间内多次失败
    unusualTimeAccess: 3,        // 凌晨访问（可疑时段）
    largeAmountAttempt: 20,      // 尝试大额交易
    blacklistAddressAttempt: 50, // 尝试向黑名单地址转账
  },
};

/**
 * 异常检测中间件
 */
export async function anomalyDetectionMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request.user as any)?.userId || 'unknown';
  const now = Date.now();

  // 检查是否被封禁
  if (blockedUsers.has(user)) {
    const stats = userStats.get(user);
    if (stats?.blockUntil && stats.blockUntil > now) {
      const remainingMinutes = Math.ceil((stats.blockUntil - now) / 60000);
      
      logger.warn(
        { user, remainingMinutes, requestId: request.id },
        'Blocked user attempt to access'
      );

      await sendTelegramAlert({
        type: 'blocked_user_access',
        user,
        ip: request.ip,
        remainingMinutes,
      });

      return reply.status(403).send({
        success: false,
        error: `Account temporarily blocked due to suspicious activity. Try again in ${remainingMinutes} minutes.`,
        blockedUntil: new Date(stats.blockUntil).toISOString(),
      });
    } else {
      // 封禁时间已过，解除封禁
      blockedUsers.delete(user);
      userStats.delete(user);
    }
  }

  // 获取或创建用户统计
  let stats = userStats.get(user);
  if (!stats) {
    stats = {
      requestCount: 0,
      failedAttempts: 0,
      lastRequestTime: now,
      suspiciousScore: 0,
    };
    userStats.set(user, stats);
  }

  // 1. 检测请求频率
  const timeSinceLastRequest = now - stats.lastRequestTime;
  if (timeSinceLastRequest < 60000) {
    // 1分钟内
    stats.requestCount++;
    if (stats.requestCount > ANOMALY_CONFIG.maxRequestsPerMinute) {
      stats.suspiciousScore += ANOMALY_CONFIG.patterns.rapidRequests;
      logger.warn(
        { user, requestCount: stats.requestCount, requestId: request.id },
        'Rapid requests detected'
      );
    }
  } else {
    // 重置计数
    stats.requestCount = 1;
  }

  // 2. 检测异常时间访问（凌晨 2-6 点）
  const hour = new Date().getHours();
  if (hour >= 2 && hour < 6) {
    stats.suspiciousScore += ANOMALY_CONFIG.patterns.unusualTimeAccess;
    logger.warn({ user, hour, requestId: request.id }, 'Unusual time access detected');
  }

  // 3. 检测 IP 变化（如果之前有记录）
  const prevIp = (stats as any).lastIp;
  if (prevIp && prevIp !== request.ip) {
    stats.suspiciousScore += 10;
    logger.warn(
      { user, prevIp, newIp: request.ip, requestId: request.id },
      'IP address changed'
    );
  }
  (stats as any).lastIp = request.ip;

  // 更新最后请求时间
  stats.lastRequestTime = now;

  // 如果可疑评分过高，封禁用户
  if (stats.suspiciousScore >= ANOMALY_CONFIG.suspiciousScoreThreshold) {
    stats.blockUntil = now + ANOMALY_CONFIG.blockDuration;
    blockedUsers.add(user);

    logger.error(
      { user, suspiciousScore: stats.suspiciousScore, requestId: request.id },
      '🚨 User blocked due to suspicious activity'
    );

    await sendTelegramAlert({
      type: 'user_blocked',
      user,
      suspiciousScore: stats.suspiciousScore,
      ip: request.ip,
      blockDuration: ANOMALY_CONFIG.blockDuration / 60000,
    });

    return reply.status(403).send({
      success: false,
      error: 'Account blocked due to suspicious activity. Please contact support.',
      blockedUntil: new Date(stats.blockUntil).toISOString(),
    });
  }
}

/**
 * 记录失败尝试
 */
export function recordFailedAttempt(user: string, reason: string) {
  const stats = userStats.get(user);
  if (!stats) return;

  stats.failedAttempts++;
  stats.suspiciousScore += ANOMALY_CONFIG.patterns.multipleFailures;

  logger.warn({ user, failedAttempts: stats.failedAttempts, reason }, 'Failed attempt recorded');

  // 如果失败次数过多，增加可疑评分
  if (stats.failedAttempts >= ANOMALY_CONFIG.maxFailedAttempts) {
    stats.suspiciousScore += 30;
  }
}

/**
 * 记录可疑交易尝试
 */
export function recordSuspiciousTransaction(
  user: string,
  type: 'large_amount' | 'blacklist_address' | 'unusual_destination',
  details: any
) {
  const stats = userStats.get(user);
  if (!stats) return;

  const scoreMap = {
    large_amount: ANOMALY_CONFIG.patterns.largeAmountAttempt,
    blacklist_address: ANOMALY_CONFIG.patterns.blacklistAddressAttempt,
    unusual_destination: 15,
  };

  stats.suspiciousScore += scoreMap[type];

  logger.warn({ user, type, details, suspiciousScore: stats.suspiciousScore }, 'Suspicious transaction attempt');

  sendTelegramAlert({
    type: 'suspicious_transaction',
    user,
    attemptType: type,
    details,
    suspiciousScore: stats.suspiciousScore,
  });
}

/**
 * 手动封禁/解封用户
 */
export function blockUser(user: string, durationMinutes: number = 30) {
  const stats = userStats.get(user) || {
    requestCount: 0,
    failedAttempts: 0,
    lastRequestTime: Date.now(),
    suspiciousScore: 1000,
  };

  stats.blockUntil = Date.now() + durationMinutes * 60000;
  userStats.set(user, stats);
  blockedUsers.add(user);

  logger.warn({ user, durationMinutes }, 'User manually blocked');
}

export function unblockUser(user: string) {
  blockedUsers.delete(user);
  userStats.delete(user);
  logger.info({ user }, 'User manually unblocked');
}

/**
 * 获取用户统计信息
 */
export function getUserStats(user: string): UserStats | null {
  return userStats.get(user) || null;
}

/**
 * 重置用户可疑评分（用于误判后恢复）
 */
export function resetUserScore(user: string) {
  const stats = userStats.get(user);
  if (stats) {
    stats.suspiciousScore = 0;
    stats.failedAttempts = 0;
    logger.info({ user }, 'User suspicious score reset');
  }
}

/**
 * 清理过期数据
 */
setInterval(() => {
  const now = Date.now();
  const expired: string[] = [];

  for (const [user, stats] of userStats.entries()) {
    // 清理1小时未活跃的用户统计
    if (now - stats.lastRequestTime > 60 * 60 * 1000) {
      expired.push(user);
    }

    // 清理已解封的用户
    if (stats.blockUntil && stats.blockUntil < now) {
      blockedUsers.delete(user);
    }
  }

  expired.forEach((user) => userStats.delete(user));

  if (expired.length > 0) {
    logger.info({ count: expired.length }, 'Cleaned up expired user stats');
  }
}, 60 * 60 * 1000); // 每小时清理一次
