import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ethers } from 'ethers';
import { HSMService } from '../services/hsm.service.js';
import { auditLog } from '../utils/audit.js';
import { logger } from '../utils/logger.js';
import {
  ipWhitelistMiddleware,
  requestSignatureMiddleware,
  transactionSecurityMiddleware,
  updateDailyStats,
} from '../middleware/security.js';
import { anomalyDetectionMiddleware } from '../middleware/anomaly-detection.js';

// 验证 JWT Token
const authenticate = async (request: FastifyRequest) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new Error('Unauthorized');
  }
};

// 以太坊交易签名请求 Schema
const EthereumSignRequestSchema = z.object({
  chainId: z.number().int().positive(),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  value: z.string().regex(/^\d+$/),
  gasLimit: z.string().regex(/^\d+$/),
  maxFeePerGas: z.string().regex(/^\d+$/).optional(),
  maxPriorityFeePerGas: z.string().regex(/^\d+$/).optional(),
  gasPrice: z.string().regex(/^\d+$/).optional(),
  nonce: z.number().int().min(0),
  data: z.string().regex(/^0x[a-fA-F0-9]*$/).optional(),
  accountIndex: z.number().int().min(0).default(0),
});

type EthereumSignRequest = z.infer<typeof EthereumSignRequestSchema>;

export async function signingRoutes(fastify: FastifyInstance) {
  const hsmService = HSMService.getInstance();

  /**
   * POST /api/sign/ethereum
   * 签名以太坊交易
   */
  fastify.post<{ Body: EthereumSignRequest }>(
    '/ethereum',
    {
      preHandler: [
        authenticate,
        anomalyDetectionMiddleware,
        ipWhitelistMiddleware,
        requestSignatureMiddleware,
        transactionSecurityMiddleware,
      ],
      schema: {
        body: {
          type: 'object',
          required: ['chainId', 'to', 'value', 'gasLimit', 'nonce'],
          properties: {
            chainId: { type: 'number' },
            to: { type: 'string' },
            value: { type: 'string' },
            gasLimit: { type: 'string' },
            maxFeePerGas: { type: 'string' },
            maxPriorityFeePerGas: { type: 'string' },
            gasPrice: { type: 'string' },
            nonce: { type: 'number' },
            data: { type: 'string' },
            accountIndex: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();

      try {
        // 验证请求体
        const body = EthereumSignRequestSchema.parse(request.body);

        logger.info(
          {
            accountIndex: body.accountIndex,
            chainId: body.chainId,
            to: body.to,
          },
          'Processing Ethereum signing request'
        );

        // 获取密钥（从 HSM）
        const { publicKey } = await hsmService.getOrCreateEthereumKey(body.accountIndex);

        // 构建交易对象
        const tx: any = {
          chainId: body.chainId,
          to: body.to,
          value: BigInt(body.value),
          gasLimit: BigInt(body.gasLimit),
          nonce: body.nonce,
          data: body.data || '0x',
        };

        // 根据是否提供 EIP-1559 参数决定交易类型
        if (body.maxFeePerGas && body.maxPriorityFeePerGas) {
          tx.type = 2;
          tx.maxFeePerGas = BigInt(body.maxFeePerGas);
          tx.maxPriorityFeePerGas = BigInt(body.maxPriorityFeePerGas);
        } else if (body.gasPrice) {
          tx.type = 0;
          tx.gasPrice = BigInt(body.gasPrice);
        } else {
          throw new Error('Must provide either (maxFeePerGas + maxPriorityFeePerGas) or gasPrice');
        }

        // 序列化交易（不包含签名）
        const unsignedTx = ethers.Transaction.from(tx);
        const txHash = unsignedTx.unsignedHash;

        // 使用 HSM 签名
        const { signature, recoveryId } = await hsmService.signEthereumHash(
          body.accountIndex,
          Buffer.from(txHash.slice(2), 'hex')
        );

        // 组装签名（r, s, v）
        const r = signature.subarray(0, 32).toString('hex');
        const s = signature.subarray(32, 64).toString('hex');
        
        // 根据 EIP-155 规范计算 v 值
        // v = chainId * 2 + 35 + recoveryId
        const v = body.chainId * 2 + 35 + recoveryId;

        logger.info({ 
          accountIndex: body.accountIndex, 
          chainId: body.chainId, 
          recoveryId, 
          v 
        }, 'Signature assembled');

        unsignedTx.signature = {
          r: '0x' + r,
          s: '0x' + s,
          v: v,
        };

        const signedTx = unsignedTx.serialized;
        const transactionHash = unsignedTx.hash!;

        // 记录审计日志
        const signatureId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await auditLog({
          signatureId,
          accountIndex: body.accountIndex,
          chainId: body.chainId,
          transactionType: 'ethereum',
          to: body.to,
          value: body.value,
          transactionHash,
          requestId: request.id,
          user: (request.user as any)?.userId || 'unknown',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        });

        // 更新每日统计
        updateDailyStats((request.user as any)?.userId || 'unknown', body.value);

        // 派生地址（从公钥）
        // 注意：实际需要正确处理公钥格式
        const address = ethers.computeAddress('0x' + publicKey.toString('hex'));

        return reply.send({
          success: true,
          data: {
            signedTransaction: signedTx,
            transactionHash,
            from: address,
            signatureId,
          },
        });
      } catch (error: any) {
        logger.error({ error, requestId: request.id }, 'Error signing Ethereum transaction');

        return reply.status(400).send({
          success: false,
          error: error.message,
          requestId: request.id,
        });
      }
    }
  );

  /**
   * GET /api/sign/address/:chain/:accountIndex
   * 获取指定账户的地址
   */
  fastify.get<{
    Params: { chain: string; accountIndex: string };
  }>(
    '/address/:chain/:accountIndex',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        const { chain, accountIndex } = request.params;
        const index = parseInt(accountIndex, 10);

        if (chain !== 'ethereum') {
          throw new Error('Only Ethereum is currently supported');
        }

        const { publicKey } = await hsmService.getOrCreateEthereumKey(index);
        const address = ethers.computeAddress('0x' + publicKey.toString('hex'));

        return reply.send({
          success: true,
          data: {
            chain,
            accountIndex: index,
            address,
          },
        });
      } catch (error: any) {
        logger.error({ error }, 'Error getting address');

        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
}
