import axios from 'axios';
import { logger } from './logger.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ALERT_CHAT_ID = process.env.TELEGRAM_ALERT_CHAT_ID || '';

interface AlertParams {
  type: string;
  [key: string]: any;
}

/**
 * 发送 Telegram 告警
 */
export async function sendTelegramAlert(params: AlertParams): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ALERT_CHAT_ID) {
    logger.warn('Telegram alert not configured, skipping');
    return;
  }

  try {
    let message = formatAlertMessage(params);

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_ALERT_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }
    );

    logger.info({ type: params.type }, 'Telegram alert sent');
  } catch (error: any) {
    logger.error({ error: error.message, type: params.type }, 'Failed to send Telegram alert');
  }
}

/**
 * 格式化告警消息
 */
function formatAlertMessage(params: AlertParams): string {
  const timestamp = new Date().toISOString();

  switch (params.type) {
    case 'blocked_user_access':
      return `🚫 *Blocked User Access Attempt*

User: \`${params.user}\`
IP: \`${params.ip}\`
Remaining: ${params.remainingMinutes} minutes
Time: ${timestamp}`;

    case 'user_blocked':
      return `🚨 *User Blocked - Suspicious Activity*

User: \`${params.user}\`
Suspicious Score: ${params.suspiciousScore}
IP: \`${params.ip}\`
Block Duration: ${params.blockDuration} minutes
Time: ${timestamp}

*Action Required: Review user activity*`;

    case 'suspicious_transaction':
      return `⚠️ *Suspicious Transaction Attempt*

User: \`${params.user}\`
Type: ${params.attemptType}
Suspicious Score: ${params.suspiciousScore}
Details: \`${JSON.stringify(params.details)}\`
Time: ${timestamp}`;

    case 'high_value_transaction':
      return `💰 *High Value Transaction*

Amount: ${params.amount} ETH
To: \`${params.to}\`
Request ID: \`${params.requestId}\`
Time: ${timestamp}

*Manual review recommended*`;

    case 'api_key_compromised':
      return `🔴 *CRITICAL: Possible API Key Compromise*

User: \`${params.user}\`
Reason: ${params.reason}
IP: \`${params.ip}\`
Time: ${timestamp}

*IMMEDIATE ACTION REQUIRED:*
1. Rotate API keys
2. Review audit logs
3. Check for unauthorized transactions`;

    case 'daily_limit_warning':
      return `📊 *Daily Limit Warning*

User: \`${params.user}\`
Used: ${params.used} ETH
Limit: ${params.limit} ETH
Usage: ${params.percentage}%
Time: ${timestamp}`;

    default:
      return `⚠️ *Security Alert*

Type: ${params.type}
Details: \`${JSON.stringify(params)}\`
Time: ${timestamp}`;
  }
}

/**
 * 发送每日统计报告
 */
export async function sendDailyReport(stats: {
  totalTransactions: number;
  totalValue: string;
  blockedAttempts: number;
  topUsers: Array<{ user: string; count: number }>;
}): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ALERT_CHAT_ID) {
    return;
  }

  const message = `📊 *Daily Signing Service Report*

*Transactions:* ${stats.totalTransactions}
*Total Value:* ${stats.totalValue} ETH
*Blocked Attempts:* ${stats.blockedAttempts}

*Top Users:*
${stats.topUsers.map((u, i) => `${i + 1}. ${u.user}: ${u.count} txs`).join('\n')}

Date: ${new Date().toISOString().split('T')[0]}`;

  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_ALERT_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }
    );

    logger.info('Daily report sent to Telegram');
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to send daily report');
  }
}
