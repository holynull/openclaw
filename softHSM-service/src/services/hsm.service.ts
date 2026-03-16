import * as pkcs11 from 'graphene-pk11';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import { EthWallet } from '@okxweb3/coin-ethereum';
import { Wallet } from 'ethers';
import fs from 'fs/promises';
import path from 'path';

/**
 * HSM Service - 管理与 SoftHSM 的 PKCS#11 交互
 * 首次初始化时自动生成助记词并显示给用户备份
 */
export class HSMService {
  private static instance: HSMService;
  private module: pkcs11.Module | null = null;
  private session: pkcs11.Session | null = null;
  private initialized = false;
  private mnemonic: string | null = null; // 内存中的助记词，仅在初始化时使用

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

      // 检查是否是首次初始化（没有任何密钥）
      await this.checkAndGenerateMnemonic();

      this.initialized = true;
    } catch (error) {
      logger.error({ error }, 'Failed to initialize HSM');
      throw error;
    }
  }

  /**
   * 检查是否需要生成助记词（首次初始化）
   */
  private async checkAndGenerateMnemonic(): Promise<void> {
    if (!this.session) {
      return;
    }

    try {
      // 检查是否已有密钥
      const objects = this.session.find({ class: pkcs11.ObjectClass.SECRET_KEY });
      
      if (objects.length > 0) {
        logger.info('Existing keys found in HSM, skipping mnemonic generation');
        return;
      }

      // 检查是否已有助记词备份文件
      const backupExists = await this.checkMnemonicBackupExists();
      if (backupExists) {
        logger.warn('⚠️  Mnemonic backup file exists but no keys in HSM');
        logger.warn('⚠️  Please check if you need to restore from backup');
        return;
      }

      // 首次初始化：生成助记词
      logger.info('🔑 First-time initialization: Generating mnemonic...');
      
      // 使用 ethers 生成助记词（更可靠）
      const ethersWallet = Wallet.createRandom();
      this.mnemonic = ethersWallet.mnemonic?.phrase || '';
      
      if (!this.mnemonic) {
        throw new Error('Failed to generate mnemonic');
      }

      // 保存助记词到备份文件
      await this.saveMnemonicBackup(this.mnemonic);

      // 输出警告
      logger.warn('╔════════════════════════════════════════════════════════════════╗');
      logger.warn('║  🚨 IMPORTANT: BACKUP YOUR MNEMONIC PHRASE NOW! 🚨             ║');
      logger.warn('╚════════════════════════════════════════════════════════════════╝');
      logger.warn('');
      logger.warn('Your mnemonic phrase has been saved to:');
      logger.warn(`  📄 ${path.resolve(config.mnemonic.backupPath)}`);
      logger.warn('');
      logger.warn('⚠️  CRITICAL ACTIONS REQUIRED:');
      logger.warn('  1. STOP THE SERVICE NOW');
      logger.warn('  2. Open the backup file and WRITE DOWN the mnemonic on paper');
      logger.warn('  3. Store the paper backup in a safe place (multiple locations)');
      logger.warn('  4. VERIFY you have written it correctly');
      logger.warn('  5. DELETE the backup file after confirming');
      logger.warn('  6. Restart the service');
      logger.warn('');
      logger.warn('⚠️  WARNING: Anyone with this mnemonic can control your assets!');
      logger.warn('⚠️  Losing this mnemonic means losing access to all keys!');
      logger.warn('');
      logger.warn('Derived addresses (for verification):');
      
      // 显示前3个派生的地址
      const ethWallet = new EthWallet();
      for (let i = 0; i < 3; i++) {
        const hdPath = `${config.mnemonic.hdPathPrefix}/${i}`;
        const privateKey = await ethWallet.getDerivedPrivateKey({ 
          mnemonic: this.mnemonic!, 
          hdPath 
        });
        const account = await ethWallet.getNewAddress({ privateKey });
        logger.warn(`  [${i}] ${account.address}`);
      }
      
      logger.warn('');
      logger.warn('After backing up, delete the file:');
      logger.warn(`  rm ${path.resolve(config.mnemonic.backupPath)}`);
      logger.warn('');
      logger.warn('═══════════════════════════════════════════════════════════════');

      // 暂停服务，等待用户备份
      logger.error('🛑 SERVICE PAUSED - Waiting for mnemonic backup');
      logger.error('🛑 Please backup the mnemonic and restart the service');
      
      // 退出进程，强制用户备份
      setTimeout(() => {
        logger.error('Exiting to ensure mnemonic backup...');
        process.exit(0);
      }, 5000);
      
    } catch (error) {
      logger.error({ error }, 'Error checking/generating mnemonic');
      throw error;
    }
  }

  /**
   * 检查助记词备份文件是否存在
   */
  private async checkMnemonicBackupExists(): Promise<boolean> {
    try {
      await fs.access(config.mnemonic.backupPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 保存助记词到备份文件
   */
  private async saveMnemonicBackup(mnemonic: string): Promise<void> {
    const content = `
╔════════════════════════════════════════════════════════════════╗
║              🔐 MNEMONIC PHRASE BACKUP 🔐                      ║
╚════════════════════════════════════════════════════════════════╝

⚠️  DO NOT SHARE THIS FILE WITH ANYONE!
⚠️  WRITE THIS DOWN ON PAPER AND DELETE THIS FILE!

Generated: ${new Date().toISOString()}

════════════════════════════════════════════════════════════════
MNEMONIC PHRASE:
════════════════════════════════════════════════════════════════

${mnemonic}

════════════════════════════════════════════════════════════════
SECURITY CHECKLIST:
════════════════════════════════════════════════════════════════

[ ] I have written the mnemonic on paper
[ ] I have verified the mnemonic is correct
[ ] I have stored the paper in a safe place
[ ] I understand losing this means losing all assets
[ ] I will delete this file after backing up

════════════════════════════════════════════════════════════════
TO DELETE THIS FILE:
════════════════════════════════════════════════════════════════

rm "${path.resolve(config.mnemonic.backupPath)}"

OR

shred -u "${path.resolve(config.mnemonic.backupPath)}"  # More secure

════════════════════════════════════════════════════════════════
`;

    await fs.writeFile(config.mnemonic.backupPath, content, { 
      mode: 0o600, // 只有所有者可读写
      encoding: 'utf-8' 
    });
    
    logger.info(`Mnemonic backup saved to: ${config.mnemonic.backupPath}`);
  }

  /**
   * 加载助记词（从备份文件，用于首次导入密钥）
   */
  private async loadMnemonicFromBackup(): Promise<string | null> {
    try {
      const exists = await this.checkMnemonicBackupExists();
      if (!exists) {
        return null;
      }

      const content = await fs.readFile(config.mnemonic.backupPath, 'utf-8');
      
      // 从文件中提取助记词（在 MNEMONIC PHRASE: 和下一个分隔线之间）
      const match = content.match(/MNEMONIC PHRASE:\s*═+\s*\n\n([\w\s]+)\n\n═+/);
      if (!match || !match[1]) {
        throw new Error('Invalid mnemonic backup file format');
      }

      return match[1].trim();
    } catch (error) {
      logger.error({ error }, 'Error loading mnemonic from backup');
      return null;
    }
  }

  /**
   * 获取或生成以太坊密钥对
   * 如果有助记词备份文件，将从助记词派生私钥并导入到 HSM
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
      const objects = this.session.find({ label: keyLabel, class: pkcs11.ObjectClass.SECRET_KEY });
      
      if (objects.length > 0) {
        logger.info({ keyLabel }, 'Found existing key in HSM');
        const secretKey = objects.items(0).toType<pkcs11.SecretKey>();
        
        // 读取存储的公钥（从标签中恢复）
        // 注意：实际情况下应该将公钥也存储在 HSM 中
        // 这里我们需要从助记词重新派生公钥（如果备份文件存在）
        const publicKey = await this.getPublicKeyForAccount(accountIndex);
        
        return {
          publicKey,
          keyHandle: secretKey,
        };
      }

      // 检查是否有助记词备份文件
      const mnemonic = await this.loadMnemonicFromBackup();
      
      if (mnemonic) {
        // 从助记词派生密钥
        logger.info({ keyLabel }, 'Deriving key from mnemonic backup');
        return await this.importKeyFromMnemonic(accountIndex, keyLabel, mnemonic);
      }

      // 如果没有助记词，抛出错误（不应该发生，因为初始化时会生成）
      throw new Error(
        'No mnemonic backup found and no existing keys. ' +
        'This should not happen. Please reinitialize the service.'
      );
      
    } catch (error) {
      logger.error({ error, keyLabel }, 'Error managing Ethereum key');
      throw error;
    }
  }

  /**
   * 获取账户的公钥（从助记词派生或从存储的元数据）
   */
  private async getPublicKeyForAccount(accountIndex: number): Promise<Buffer> {
    // 尝试从助记词备份派生
    const mnemonic = await this.loadMnemonicFromBackup();
    
    if (mnemonic) {
      const wallet = new EthWallet();
      const hdPath = `${config.mnemonic.hdPathPrefix}/${accountIndex}`;
      const privateKey = await wallet.getDerivedPrivateKey({ mnemonic, hdPath });
      const account = await wallet.getNewAddress({ privateKey });
      return Buffer.from(account.publicKey.slice(2), 'hex');
    }

    // 如果没有助记词备份，返回一个占位符
    // 实际生产环境应该将公钥存储在 HSM 的元数据中
    logger.warn('No mnemonic backup found, using placeholder public key');
    return Buffer.alloc(64);
  }

  /**
   * 从助记词派生私钥并导入到 HSM
   */
  private async importKeyFromMnemonic(
    accountIndex: number,
    keyLabel: string,
    mnemonic: string
  ): Promise<{ publicKey: Buffer; keyHandle: pkcs11.Key }> {
    try {
      const wallet = new EthWallet();
      const hdPath = `${config.mnemonic.hdPathPrefix}/${accountIndex}`;
      
      logger.info({ accountIndex, hdPath }, 'Deriving private key from mnemonic');
      
      // 从助记词派生私钥
      const derivedKey = await wallet.getDerivedPrivateKey({
        mnemonic,
        hdPath,
      });

      if (!derivedKey) {
        throw new Error('Failed to derive private key from mnemonic');
      }

      // 移除 '0x' 前缀（如果有）
      const privateKeyHex = derivedKey.startsWith('0x') ? derivedKey.slice(2) : derivedKey;
      const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');

      // ⚠️ 注意：这里我们使用对称密钥导入方式作为简化
      // 生产环境建议使用更安全的密钥包装方式
      
      // 将私钥导入为 HSM 中的密钥对象
      // 由于 PKCS#11 限制，我们将私钥存储为 SECRET_KEY
      const importedKey = (this.session as any).createObject({
        class: pkcs11.ObjectClass.SECRET_KEY,
        keyType: pkcs11.KeyType.GENERIC_SECRET,
        token: true,
        private: true,
        sensitive: true,
        extractable: false, // 不可导出
        label: keyLabel,
        id: Buffer.from(keyLabel),
        value: privateKeyBuffer,
      });

      // 计算公钥（用于返回地址）
      const account = await wallet.getNewAddress({
        privateKey: derivedKey,
      });

      // 从地址反推公钥（简化处理）
      // 注意：实际应该从私钥直接计算公钥
      const publicKeyBuffer = Buffer.from(account.publicKey.slice(2), 'hex');

      logger.info({ keyLabel, address: account.address }, 'Key imported from mnemonic successfully');

      // 清除内存中的私钥
      privateKeyBuffer.fill(0);

      return {
        publicKey: publicKeyBuffer,
        keyHandle: importedKey,
      };
    } catch (error) {
      logger.error({ error, accountIndex }, 'Error importing key from mnemonic');
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
      this.session.find({ class: pkcs11.ObjectClass.PRIVATE_KEY });
      return true;
    } catch (error) {
      logger.error({ error }, 'HSM health check failed');
      return false;
    }
  }
}
