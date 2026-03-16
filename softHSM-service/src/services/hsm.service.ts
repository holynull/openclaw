import * as pkcs11 from 'graphene-pk11';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * HSM Service - 管理与 SoftHSM 的 PKCS#11 交互
 */
export class HSMService {
  private static instance: HSMService;
  private module: pkcs11.Module | null = null;
  private session: pkcs11.Session | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): HSMService {
    if (!HSMService.instance) {
      HSMService.instance = new HSMService();
    }
    return HSMService.instance;
  }

  /**
   * 初始化 HSM 连接
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('HSM already initialized');
      return;
    }

    try {
      // 加载 PKCS#11 模块
      this.module = pkcs11.Module.load(config.hsm.modulePath, 'SoftHSM');
      this.module.initialize();

      logger.info('PKCS#11 module loaded and initialized');

      // 查找 Token
      const slots = this.module.getSlots(true); // true = only slots with tokens
      let targetSlot: pkcs11.Slot | null = null;

      for (let i = 0; i < slots.length; i++) {
        const slot = slots.items(i);
        const token = slot.getToken();
        if (token.label.trim() === config.hsm.tokenLabel) {
          targetSlot = slot;
          break;
        }
      }

      if (!targetSlot) {
        throw new Error(`Token '${config.hsm.tokenLabel}' not found`);
      }

      logger.info({ label: config.hsm.tokenLabel }, 'Token found');

      // 打开会话并登录
      this.session = targetSlot.open(
        pkcs11.SessionFlag.SERIAL_SESSION | pkcs11.SessionFlag.RW_SESSION
      );
      
      this.session.login(config.hsm.pin, pkcs11.UserType.USER);
      
      logger.info('HSM session opened and logged in');

      this.initialized = true;
    } catch (error) {
      logger.error({ error }, 'Failed to initialize HSM');
      throw error;
    }
  }

  /**
   * 获取或生成以太坊密钥对
   */
  async getOrCreateEthereumKey(accountIndex: number): Promise<{
    publicKey: Buffer;
    keyHandle: pkcs11.Key;
  }> {
    if (!this.session) {
      throw new Error('HSM not initialized');
    }

    const keyLabel = `eth-key-${accountIndex}`;

    try {
      // 查找现有密钥
      const objects = this.session.find({ label: keyLabel, class: pkcs11.ObjectClass.PRIVATE_KEY });
      
      if (objects.length > 0) {
        logger.info({ keyLabel }, 'Found existing key');
        const privateKey = objects.items(0).toType<pkcs11.PrivateKey>();
        
        // 获取对应的公钥
        const pubKeyObjects = this.session.find({ 
          label: keyLabel, 
          class: pkcs11.ObjectClass.PUBLIC_KEY 
        });
        
        const publicKey = pubKeyObjects.items(0).toType<pkcs11.PublicKey>();
        const pubKeyValue = publicKey.getAttribute({ pointEC: null }).pointEC as Buffer;
        
        return {
          publicKey: pubKeyValue,
          keyHandle: privateKey,
        };
      }

      // 生成新密钥对（ECDSA secp256k1 - 以太坊使用的曲线）
      logger.info({ keyLabel }, 'Generating new key pair');
      
      // 注意：SoftHSM 可能不支持 secp256k1，需要检查
      // 这里使用 ECDSA 作为示例，实际生产环境需要验证
      const keys = this.session.generateKeyPair(
        pkcs11.KeyGenMechanism.ECDSA,
        {
          keyType: pkcs11.KeyType.ECDSA,
          token: true,
          private: true,
          label: keyLabel,
          id: Buffer.from(keyLabel),
          // ecParams: Buffer.from('06052b8104000a', 'hex'), // secp256k1 OID
        },
        {
          keyType: pkcs11.KeyType.ECDSA,
          token: true,
          label: keyLabel,
          id: Buffer.from(keyLabel),
        }
      );

      const publicKey = keys.publicKey.toType<pkcs11.PublicKey>();
      const pubKeyValue = publicKey.getAttribute({ pointEC: null }).pointEC as Buffer;

      logger.info({ keyLabel }, 'Key pair generated successfully');

      return {
        publicKey: pubKeyValue,
        keyHandle: keys.privateKey,
      };
    } catch (error) {
      logger.error({ error, keyLabel }, 'Error managing Ethereum key');
      throw error;
    }
  }

  /**
   * 使用 HSM 签名以太坊交易哈希
   */
  async signEthereumHash(
    accountIndex: number,
    messageHash: Buffer
  ): Promise<{ signature: Buffer; recoveryId: number }> {
    if (!this.session) {
      throw new Error('HSM not initialized');
    }

    try {
      const { keyHandle } = await this.getOrCreateEthereumKey(accountIndex);

      // 使用 ECDSA 签名
      const signature = this.session
        .createSign(pkcs11.MechanismEnum.ECDSA, keyHandle)
        .once(messageHash);

      logger.info({ accountIndex }, 'Transaction hash signed successfully');

      // 注意：实际实现需要处理 recovery ID 的计算
      // 这里简化处理，实际需要根据公钥恢复
      return {
        signature,
        recoveryId: 0, // 需要实际计算
      };
    } catch (error) {
      logger.error({ error, accountIndex }, 'Error signing transaction');
      throw error;
    }
  }

  /**
   * 关闭 HSM 连接
   */
  async close(): Promise<void> {
    try {
      if (this.session) {
        this.session.logout();
        this.session.close();
        this.session = null;
        logger.info('HSM session closed');
      }

      if (this.module) {
        this.module.finalize();
        this.module = null;
        logger.info('PKCS#11 module finalized');
      }

      this.initialized = false;
    } catch (error) {
      logger.error({ error }, 'Error closing HSM');
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.session || !this.initialized) {
        return false;
      }

      // 尝试列出对象作为健康检查
      this.session.find({ class: pkcs11.ObjectClass.PRIVATE_KEY }, { index: 0 });
      return true;
    } catch (error) {
      logger.error({ error }, 'HSM health check failed');
      return false;
    }
  }
}
