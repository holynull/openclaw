#!/usr/bin/env tsx

/**
 * 助记词管理工具
 * 用于生成、验证和管理助记词
 */

import { EthWallet } from '@okxweb3/coin-ethereum';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function generateMnemonic() {
  console.log('\n🔐 生成新助记词\n');
  console.log('⚠️  重要提示：');
  console.log('  - 请将助记词写在纸上，妥善保管');
  console.log('  - 不要截图、拍照或保存在电脑上');
  console.log('  - 任何人获得助记词都可以控制您的资产');
  console.log('  - 丢失助记词意味着永久丢失资产\n');

  const confirm = await question('确认生成新助记词？(yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('已取消');
    rl.close();
    return;
  }

  const wallet = new EthWallet();
  const mnemonic = await wallet.generateMnemonic();

  console.log('\n✅ 助记词已生成：\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(mnemonic);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 派生几个测试地址
  console.log('📍 派生的地址（用于验证）：\n');
  for (let i = 0; i < 3; i++) {
    const hdPath = `m/44'/60'/0'/0/${i}`;
    const privateKey = await wallet.getDerivedPrivateKey({ mnemonic, hdPath });
    const account = await wallet.getNewAddress({ privateKey });
    console.log(`  [${i}] ${account.address}`);
  }

  console.log('\n⚠️  请务必：');
  console.log('  1. 将助记词写在纸上');
  console.log('  2. 验证你写下的助记词是否正确');
  console.log('  3. 将纸质备份存放在安全的地方（考虑多个备份）');
  console.log('  4. 永远不要将助记词存储在电脑或网络上\n');

  const copied = await question('已安全保存助记词？(yes/no): ');
  if (copied.toLowerCase() === 'yes') {
    console.log('\n✅ 很好！现在可以将助记词设置到环境变量：');
    console.log(`\n  export WALLET_MNEMONIC="${mnemonic}"\n`);
    console.log('或添加到 .env 文件中（生产环境不推荐）：');
    console.log(`\n  WALLET_MNEMONIC="${mnemonic}"\n`);
  }

  rl.close();
}

async function verifyMnemonic() {
  console.log('\n🔍 验证助记词\n');

  const mnemonic = await question('请输入助记词: ');
  
  if (!mnemonic.trim()) {
    console.log('❌ 助记词不能为空');
    rl.close();
    return;
  }

  try {
    const wallet = new EthWallet();
    
    // 尝试派生第一个地址来验证助记词
    const hdPath = `m/44'/60'/0'/0/0`;
    const privateKey = await wallet.getDerivedPrivateKey({ 
      mnemonic: mnemonic.trim(), 
      hdPath 
    });
    
    if (!privateKey) {
      throw new Error('Invalid mnemonic');
    }

    const account = await wallet.getNewAddress({ privateKey });

    console.log('\n✅ 助记词有效！\n');
    console.log('派生的地址：\n');
    
    for (let i = 0; i < 5; i++) {
      const path = `m/44'/60'/0'/0/${i}`;
      const pk = await wallet.getDerivedPrivateKey({ mnemonic: mnemonic.trim(), hdPath: path });
      const acc = await wallet.getNewAddress({ privateKey: pk });
      console.log(`  [${i}] ${acc.address}`);
    }

    console.log('\n');
  } catch (error: any) {
    console.log('❌ 助记词无效或格式错误');
    console.log(`   错误: ${error.message}`);
  }

  rl.close();
}

async function deriveAddresses() {
  console.log('\n📍 从助记词派生地址\n');

  const mnemonic = await question('请输入助记词: ');
  const countStr = await question('要派生多少个地址？(默认 10): ');
  const count = parseInt(countStr) || 10;

  if (!mnemonic.trim()) {
    console.log('❌ 助记词不能为空');
    rl.close();
    return;
  }

  try {
    const wallet = new EthWallet();
    console.log('\n派生的地址：\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (let i = 0; i < count; i++) {
      const hdPath = `m/44'/60'/0'/0/${i}`;
      const privateKey = await wallet.getDerivedPrivateKey({ 
        mnemonic: mnemonic.trim(), 
        hdPath 
      });
      const account = await wallet.getNewAddress({ privateKey });
      console.log(`[${i.toString().padStart(3, ' ')}] ${account.address}`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.log('❌ 处理失败');
    console.log(`   错误: ${error.message}`);
  }

  rl.close();
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║      助记词管理工具 - Mnemonic Manager      ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('请选择操作：');
  console.log('  1. 生成新助记词');
  console.log('  2. 验证助记词');
  console.log('  3. 从助记词派生地址');
  console.log('  4. 退出\n');

  const choice = await question('请输入选项 (1-4): ');

  switch (choice.trim()) {
    case '1':
      await generateMnemonic();
      break;
    case '2':
      await verifyMnemonic();
      break;
    case '3':
      await deriveAddresses();
      break;
    case '4':
      console.log('再见！');
      rl.close();
      break;
    default:
      console.log('无效选项');
      rl.close();
  }
}

main().catch((error) => {
  console.error('错误:', error);
  rl.close();
  process.exit(1);
});
