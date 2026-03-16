import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  },
  
  hsm: {
    modulePath: process.env.SOFTHSM_MODULE || '/usr/local/lib/softhsm/libsofthsm2.so',
    tokenLabel: process.env.HSM_TOKEN_LABEL || 'wallet-custody',
    pin: process.env.HSM_PIN || '',
  },
  
  apiKeys: {
    salt: process.env.API_KEY_SALT || 'change-me-in-production',
    validKeys: process.env.VALID_API_KEYS?.split(',') || [],
  },
  
  audit: {
    enabled: process.env.AUDIT_ENABLED === 'true',
    logPath: process.env.AUDIT_LOG_PATH || './logs/audit.log',
  },

  // 助记词配置（可选，用于密钥恢复）
  mnemonic: {
    // 如果提供了助记词，将从助记词派生密钥导入到 HSM
    seed: process.env.WALLET_MNEMONIC || '',
    // HD 钱包路径前缀 (BIP44: m/44'/60'/0'/0/{index})
    hdPathPrefix: process.env.HD_PATH_PREFIX || "m/44'/60'/0'/0",
  },
};

// 验证必需的环境变量
const requiredEnvVars = ['HSM_PIN', 'JWT_SECRET', 'API_KEY_SALT'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
