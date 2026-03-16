import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { logger } from './logger.js';

interface AuditLogEntry {
  signatureId: string;
  accountIndex: number;
  chainId: number;
  transactionType: string;
  to: string;
  value: string;
  transactionHash: string;
  requestId: string;
  user: string;
  timestamp: string;
  duration: number;
}

/**
 * 写入审计日志
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  if (!config.audit.enabled) {
    return;
  }

  try {
    const logDir = path.dirname(config.audit.logPath);
    await fs.mkdir(logDir, { recursive: true });

    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(config.audit.logPath, logLine);

    logger.info({ signatureId: entry.signatureId }, 'Audit log written');
  } catch (error) {
    logger.error({ error }, 'Failed to write audit log');
    // 不抛出错误，避免影响主流程
  }
}
