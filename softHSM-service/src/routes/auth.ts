import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { config } from '../config.js';
import { apiKeyStore } from '../utils/api-key-store.js';

const LoginSchema = z.object({
  apiKey: z.string().min(32),
  secret: z.string().min(32),
});

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/login
   * 使用 API Key 和 Secret 获取 JWT Token
   */
  fastify.post('/login', async (request, reply) => {
    try {
      const { apiKey, secret } = LoginSchema.parse(request.body);

      // 验证 API Key 和 Secret
      // 首先检查 API Key 是否存在于 Store 中（如果配置了 API_KEY_PAIRS）
      const storedSecret = apiKeyStore.getSecret(apiKey);
      let isValid = false;

      if (storedSecret) {
        // 如果在 Store 中找到了，直接比较 secret
        isValid = storedSecret === secret;
      } else {
        // 向后兼容：如果没有配置 API_KEY_PAIRS，使用原有的 hash 验证方式
        const hash = crypto
          .createHmac('sha256', config.apiKeys.salt)
          .update(apiKey + secret)
          .digest('hex');
        isValid = config.apiKeys.validKeys.includes(hash);
      }

      if (!isValid) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid API credentials',
        });
      }

      // 生成 JWT Token，存储完整的 apiKey（用于签名验证）
      const token = fastify.jwt.sign({
        userId: apiKey.slice(0, 8),
        apiKey: apiKey, // 存储完整 apiKey 用于查找对应的 secret
        role: 'signer',
      });

      return reply.send({
        success: true,
        data: {
          token,
          expiresIn: config.jwt.expiresIn,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /auth/refresh
   * 刷新 JWT Token
   */
  fastify.post('/refresh', async (request, reply) => {
    try {
      await request.jwtVerify();
      
      const user = request.user as any;
      const newToken = fastify.jwt.sign({
        userId: user.userId,
        role: user.role,
      });

      return reply.send({
        success: true,
        data: {
          token: newToken,
          expiresIn: config.jwt.expiresIn,
        },
      });
    } catch (error: any) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  });
}
