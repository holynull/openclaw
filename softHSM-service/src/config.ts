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
};

// 验证必需的环境变量
const requiredEnvVars = ['HSM_PIN', 'JWT_SECRET', 'API_KEY_SALT'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
