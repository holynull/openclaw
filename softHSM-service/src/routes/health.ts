import { FastifyInstance } from 'fastify';
import { HSMService } from '../services/hsm.service.js';

export async function healthRoutes(fastify: FastifyInstance) {
  const hsmService = HSMService.getInstance();

  /**
   * GET /health
   * 基本健康检查
   */
  fastify.get('/', async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * GET /health/ready
   * 就绪检查（包括 HSM 状态）
   */
  fastify.get('/ready', async (request, reply) => {
    const hsmHealthy = await hsmService.healthCheck();

    if (!hsmHealthy) {
      return reply.status(503).send({
        status: 'error',
        message: 'HSM not ready',
      });
    }

    return reply.send({
      status: 'ready',
      hsm: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/live
   * 存活检查
   */
  fastify.get('/live', async (request, reply) => {
    return reply.send({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });
}
