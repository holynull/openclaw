import crypto from 'crypto';

/**
 * 生成 SoftHSM API Key 和 Secret
 * 使用方法: node scripts/generate-softhsm-apikey.js [salt]
 * 
 * salt 参数可选，如果不提供则使用默认值
 */

function generateApiCredentials() {
  // 从命令行参数获取 salt，或使用默认值
  const salt = process.argv[2] || 'test-salt-7d18764bbbb09b075f975c4bfdfc8f8c';
  
  // 生成 API Key 和 Secret
  const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
  const apiSecret = 'as_' + crypto.randomBytes(32).toString('hex');

  // 生成哈希值 (使用 HMAC-SHA256，匹配 softhsm-service/auth.ts 的逻辑)
  const hashedKey = crypto
    .createHmac('sha256', salt)
    .update(apiKey + apiSecret)
    .digest('hex');

  console.log('\n=== SoftHSM API Credentials ===\n');
  console.log('Salt used:', salt);
  console.log('\n添加到 .env 文件:');
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
