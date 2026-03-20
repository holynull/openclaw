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
        logger.info('📥 Restoring keys from backup file...');
        
        // 从备份文件加载助记词并导入密钥
        const mnemonic = await this.loadMnemonicFromBackup();
        if (mnemonic) {
          await this.importKeyFromMnemonic(0, 'eth-key-0', mnemonic);
          logger.info('✅ Keys restored from backup successfully');
          logger.warn('');
          logger.warn('🔐 BACKUP REMINDER: Mnemonic backup file still exists');
          logger.warn('');
          logger.warn('  To backup and delete securely, run:');
          logger.warn('    docker exec -it softhsm-service sh /app/scripts/backup-mnemonic.sh');
          logger.warn('');
        } else {
          logger.error('❌ Failed to load mnemonic from backup file');
        }
        
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

      // 🔑 批量导入前 10 个账户密钥到 HSM（防止删除 mnemonic 后无法使用）
      logger.info('📥 Importing first 10 keys into HSM...');
      const ethWallet = new EthWallet();
      const addresses: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const keyLabel = `eth-key-${i}`;
        logger.info(`  [${i}] Importing ${keyLabel}...`);
        
        const result = await this.importKeyFromMnemonic(i, keyLabel, this.mnemonic);
        
        // 从公钥计算地址用于显示
        const hdPath = `${config.mnemonic.hdPathPrefix}/${i}`;
        const privateKey = await ethWallet.getDerivedPrivateKey({ 
          mnemonic: this.mnemonic!, 
          hdPath 
        });
        const account = await ethWallet.getNewAddress({ privateKey });
        addresses.push(account.address);
        
        logger.info(`  [${i}] ✓ ${account.address}`);
      }
      
      logger.info('✅ All 10 keys imported successfully');

      // 输出警告
      logger.warn('╔════════════════════════════════════════════════════════════════╗');
      logger.warn('║  🚨 IMPORTANT: BACKUP YOUR MNEMONIC PHRASE NOW! 🚨             ║');
      logger.warn('╚════════════════════════════════════════════════════════════════╝');
      logger.warn('');
      logger.warn('Your mnemonic phrase has been saved to:');
      logger.warn(`  📄 ${path.resolve(config.mnemonic.backupPath)}`);
      logger.warn('');
      logger.warn('⚠️  CRITICAL ACTIONS:');
      logger.warn('  RECOMMENDED: Use the interactive backup script');
      logger.warn('');
      logger.warn('  Execute in the container:');
      logger.warn('    docker exec -it softhsm-service sh /app/scripts/backup-mnemonic.sh');
      logger.warn('');
      logger.warn('  OR manually:');
      logger.warn('    1. View the backup file and WRITE DOWN the mnemonic on paper');
      logger.warn('    2. Store the paper backup in multiple safe locations');
      logger.warn('    3. DELETE the backup file: docker exec softhsm-service shred -u ' + config.mnemonic.backupPath);
      logger.warn('');
      logger.warn('⚠️  WARNING: Anyone with this mnemonic can control your assets!');
      logger.warn('⚠️  Losing this mnemonic means losing access to all keys!');
      logger.warn('');
      logger.warn('Derived addresses (accounts 0-9):');
      
      // 显示所有 10 个地址
      for (let i = 0; i < addresses.length; i++) {
        logger.warn(`  [${i}] ${addresses[i]}`);
      }
      
      logger.warn('');
      logger.warn('═══════════════════════════════════════════════════════════════');
      logger.warn('');
      logger.warn('🔐 Service is running. Please backup your mnemonic as soon as possible.');
      logger.warn('');
      
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
      // 查找现有密钥 - 修改为查找 PRIVATE_KEY 而不是 SECRET_KEY
      const objects = this.session.find({ label: keyLabel, class: pkcs11.ObjectClass.PRIVATE_KEY });
      
      if (objects.length > 0) {
        logger.info({ keyLabel }, 'Found existing key in HSM');
        const privateKey = objects.items(0).toType<pkcs11.PrivateKey>();
        
        // 读取存储的公钥（从标签中恢复）
        // 注意：实际情况下应该将公钥也存储在 HSM 中
        // 这里我们需要从助记词重新派生公钥（如果备份文件存在）
        const publicKey = await this.getPublicKeyForAccount(accountIndex);
        
        return {
          publicKey,
          keyHandle: privateKey,
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
   * 获取账户的公钥（优先从 HSM 读取，其次从助记词派生）
   */
  private async getPublicKeyForAccount(accountIndex: number): Promise<Buffer> {
    if (!this.session) {
      throw new Error('HSM not initialized');
    }

    const keyLabel = `eth-key-${accountIndex}`;
    const publicKeyLabel = `${keyLabel}-public`;

    // 1. 优先从 HSM 中读取存储的公钥
    try {
      const publicKeyObjects = this.session.find({ 
        label: publicKeyLabel, 
        class: pkcs11.ObjectClass.DATA 
      });
      
      if (publicKeyObjects.length > 0) {
        const dataObj = publicKeyObjects.items(0).toType<pkcs11.Data>();
        const publicKeyBuffer = dataObj.value as Buffer;
        logger.info({ publicKeyLabel }, '✓ Public key loaded from HSM');
        return publicKeyBuffer;
      }
    } catch (error) {
      logger.warn({ error, publicKeyLabel }, 'Failed to load public key from HSM');
    }

    // 2. 尝试从助记词备份派生（兼容旧数据）
    const mnemonic = await this.loadMnemonicFromBackup();
    
    if (mnemonic) {
      logger.info({ accountIndex }, 'Deriving public key from mnemonic backup');
      const wallet = new EthWallet();
      const hdPath = `${config.mnemonic.hdPathPrefix}/${accountIndex}`;
      const privateKey = await wallet.getDerivedPrivateKey({ mnemonic, hdPath });
      const account = await wallet.getNewAddress({ privateKey });
      const publicKeyBuffer = Buffer.from(account.publicKey.slice(2), 'hex');
      
      // 存储到 HSM 供下次使用
      try {
        this.session.create({
          class: pkcs11.ObjectClass.DATA,
          label: publicKeyLabel,
          token: true,
          private: false,
          application: 'ethereum-public-key',
          value: publicKeyBuffer,
        });
        logger.info({ publicKeyLabel }, '✓ Public key cached to HSM');
      } catch (error) {
        logger.warn({ error }, 'Failed to cache public key');
      }
      
      return publicKeyBuffer;
    }

    // 3. 无法获取公钥，抛出错误
    throw new Error(
      `Cannot retrieve public key for account ${accountIndex}: ` +
      `No public key in HSM and no mnemonic backup found. ` +
      `The key may need to be re-imported.`
    );
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

      logger.info('✓ Private key derived successfully');

      // 移除 '0x' 前缀（如果有）
      const privateKeyHex = derivedKey.startsWith('0x') ? derivedKey.slice(2) : derivedKey;
      const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');

      logger.info({ keyLabel, bufferLength: privateKeyBuffer.length }, 'Importing key to HSM...');

      // secp256k1 椭圆曲线参数 (OID: 1.3.132.0.10)
      // DER 编码: 06 05 2B 81 04 00 0A
      const secp256k1Params = Buffer.from('06052B8104000A', 'hex');
      
      // 将私钥导入为 EC 私钥对象
      const importedKey = this.session!.create({
        class: pkcs11.ObjectClass.PRIVATE_KEY,
        keyType: pkcs11.KeyType.EC,
        token: true,
        private: true,
        sensitive: true,
        extractable: false, // 不可导出
        sign: true, // 允许签名
        label: keyLabel,
        id: Buffer.from(keyLabel),
        ecParams: secp256k1Params, // secp256k1 曲线参数
        value: privateKeyBuffer, // EC 私钥值
      }).toType<pkcs11.PrivateKey>();

      logger.info('✓ Key imported to HSM');

      // 计算公钥（用于返回地址）
      const account = await wallet.getNewAddress({
        privateKey: derivedKey,
      });

      // 从地址反推公钥（简化处理）
      // 注意：实际应该从私钥直接计算公钥
      const publicKeyBuffer = Buffer.from(account.publicKey.slice(2), 'hex');

      // 🔑 将公钥也存储到 HSM 中（持久化）
      const publicKeyLabel = `${keyLabel}-public`;
      try {
        this.session!.create({
          class: pkcs11.ObjectClass.DATA,
          label: publicKeyLabel,
          token: true, // 持久化
          private: false,
          application: 'ethereum-public-key',
          value: publicKeyBuffer,
        });
        logger.info({ publicKeyLabel }, '✓ Public key stored in HSM');
      } catch (error) {
        logger.warn({ error, publicKeyLabel }, 'Failed to store public key in HSM (may already exist)');
      }

      logger.info({ keyLabel, address: account.address }, 'Key imported from mnemonic successfully');

      // 清除内存中的私钥
      privateKeyBuffer.fill(0);

      return {
        publicKey: publicKeyBuffer,
        keyHandle: importedKey,
      };
    } catch (error) {
      logger.error({ 
        error, 
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        accountIndex 
      }, 'Error importing key from mnemonic');
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
