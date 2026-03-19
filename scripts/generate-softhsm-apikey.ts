import crypto from 'crypto';

/**
 * 生成 SoftHSM API Key 和 Secret
 * 使用方法: node --import tsx scripts/generate-softhsm-apikey.ts
 */

function generateApiCredentials() {
  // 生成 API Key 和 Secret
  const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
  const apiSecret = 'as_' + crypto.randomBytes(32).toString('hex');

  // 生成哈希值 (用于 VALID_API_KEYS)
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey + apiSecret)
    .digest('hex');

  console.log('\n=== SoftHSM API Credentials ===\n');
  console.log('添加到 .env 文件:');
  console.log('----------------------------');
  console.log(`SOFTHSM_API_KEY="${apiKey}"`);
  console.log(`SOFTHSM_API_SECRET="${apiSecret}"`);
  console.log(`VALID_API_KEYS="${hashedKey}"`);
  console.log('\n添加到 docker-compose.yml 的 openclaw-gateway-2 环境变量:');
  console.log('----------------------------');
  console.log('  SOFTHSM_API_KEY: ${SOFTHSM_API_KEY}');
  console.log('  SOFTHSM_API_SECRET: ${SOFTHSM_API_SECRET}');
  console.log('  SOFTHSM_SERVICE_URL: http://softhsm-service:3000');
  console.log('\n');
}

generateApiCredentials();
