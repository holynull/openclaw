import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { signingRoutes } from './routes/signing.js';
import { healthRoutes } from './routes/health.js';
import { logger } from './utils/logger.js';
import { HSMService } from './services/hsm.service.js';

const fastify = Fastify({
  logger: logger,
  requestIdLogLabel: 'requestId',
  disableRequestLogging: false,
});

// 注册插件
await fastify.register(cors, {
  origin: config.cors.allowedOrigins,
  credentials: true,
});

await fastify.register(jwt, {
  secret: config.jwt.secret,
  sign: {
    expiresIn: config.jwt.expiresIn,
  },
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
    };
  },
});

// 初始化 HSM 服务
const hsmService = HSMService.getInstance();
try {
  await hsmService.initialize();
  logger.info('HSM Service initialized successfully');
} catch (error) {
  logger.error({ error }, 'Failed to initialize HSM Service');
  process.exit(1);
}

// 注册路由
await fastify.register(healthRoutes, { prefix: '/health' });
await fastify.register(authRoutes, { prefix: '/auth' });
await fastify.register(signingRoutes, { prefix: '/api/sign' });

// 全局错误处理
fastify.setErrorHandler((error, request, reply) => {
  logger.error({ error, requestId: request.id }, 'Request error');
  
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message || 'Internal Server Error',
    requestId: request.id,
  });
});

// 优雅关闭
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, closing server gracefully`);
  
  try {
    // 关闭 HSM 连接
    await hsmService.close();
    
    // 关闭 Fastify 服务器
    await fastify.close();
    
    logger.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
const start = async () => {
  try {
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });
    
    logger.info(
      `🚀 Signing Service running on http://${config.server.host}:${config.server.port}`
    );
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
