# Wallet Manager - OpenClaw 多链钱包管理插件

基于 OKX Wallet SDK 开发的完整多链钱包管理解决方案。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd extensions/wallet-manager
npm install  # 或 pnpm install
```

### 2. 配置环境变量

```bash
# 设置助记词（必需）
export WALLET_MNEMONIC="your twelve word mnemonic phrase here"

# 设置 Infura API Key（强烈推荐，支持多链）
export INFURA_KEY="your_infura_api_key_here"
```

> 💡 **提示**: 查看 [INFURA_CONFIG.md](./INFURA_CONFIG.md) 了解如何获取和配置 Infura API Key

### 3. 测试功能

```bash
# 赋予执行权限
chmod +x test-wallet.sh

# 运行所有测试
./test-wallet.sh all

# 或测试特定功能
./test-wallet.sh address   # 测试地址生成
./test-wallet.sh balance   # 测试余额查询
./test-wallet.sh transfer  # 测试转账（不广播）
```

## 📚 文档

- **[使用指南](./README_USAGE.md)** - 完整的 API 文档和使用示例
- **[Infura 配置](./INFURA_CONFIG.md)** - 多链 RPC 配置指南（推荐阅读）
- **[部署指南](./DEPLOYMENT_GUIDE.md)** - Docker 环境配置和部署
- **[API 参考](./API_REFERENCE.md)** - 快速 API 查询手册
- **[实现总结](./IMPLEMENTATION_SUMMARY.md)** - 技术架构和功能清单

## ✨ 核心功能

### 🔹 Ethereum/EVM (6 个工具)

| 工具 | 功能 |
|------|------|
| `eth_get_address` | 获取以太坊地址（支持多账户） |
| `eth_get_balance` | 查询 ETH 余额 |
| `eth_get_token_balance` | 查询 ERC20 代币余额 |
| `eth_transfer` | ETH 转账（Legacy + EIP-1559） |
| `eth_transfer_token` | ERC20 代币转账 |
| `eth_sign_message` | 消息签名（EIP-191） |

### 🔹 Bitcoin (1 个工具)

- `btc_get_address` - 获取 Bitcoin 地址（Legacy/SegWit/Native SegWit）

### 🔹 Solana (1 个工具)

- `sol_get_address` - 获取 Solana 地址

## 🎯 使用示例

### 获取地址

```json
// Default account (0)
{}

// Specify account index
{ "accountIndex": 1 }

// Account 5
{ "accountIndex": 5 }
```

### Query Balance

```json
// Query own balance
{ "accountIndex": 0 }

// 查询其他地址
{ "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" }

// 查询 ERC20 代币
{
  "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "accountIndex": 0
}
```

### ETH 转账

```json
// 离线签名（不广播）
{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "0.1",
  "broadcast": false
}

// 广播交易
{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "0.1",
  "broadcast": true
}
```

## 🛠️ 技术栈

- **OKX Wallet SDK** - 多链钱包核心
- **Ethers.js v6** - 链交互和查询
- **TypeBox** - 参数类型定义
- **OpenClaw** - 插件框架

## 🔐 安全特性

- ✅ 助记词从环境变量读取
- ✅ 私钥实时派生，不持久化
- ✅ 支持离线签名
- ✅ 可选交易广播
- ✅ 完整的参数验证

## 📁 项目结构

```
wallet-manager/
├── index.ts                      # 主插件（680+ 行）
├── package.json                  # 依赖配置
├── openclaw.plugin.json          # 插件元数据
├── README.md                     # 本文件
├── README_USAGE.md               # 详细使用文档
├── DEPLOYMENT_GUIDE.md           # 部署配置指南
├── IMPLEMENTATION_SUMMARY.md     # 实现总结
├── test-wallet.sh                # 测试脚本
└── index_backup.ts               # 原始备份
```

## 🌐 支持的网络

通过 `chainId` 参数支持所有 EVM 兼容网络。使用 **Infura** 提供高性能多链访问：

### 主网
- **Ethereum** (chainId: 1) - 自动使用 Infura
- **Polygon** (chainId: 137) - 自动使用 Infura
- **Arbitrum** (chainId: 42161) - 自动使用 Infura
- **Optimism** (chainId: 10) - 自动使用 Infura
- **Base** (chainId: 8453) - 自动使用 Infura
- **Avalanche** (chainId: 43114) - 自动使用 Infura
- **Linea** (chainId: 59144) - 自动使用 Infura
- **BSC** (chainId: 56) - 公共端点

### 测试网
- **Sepolia** (chainId: 11155111) - Infura
- **Polygon Amoy** (chainId: 80002) - Infura
- **Arbitrum Sepolia** (chainId: 421614) - Infura
- **Base Sepolia** (chainId: 84532) - Infura

> 📖 查看 [INFURA_CONFIG.md](./INFURA_CONFIG.md) 了解完整的链列表和配置

## 🔧 依赖安装

```json
{
  "@okxweb3/coin-ethereum": "^2.0.0",
  "@okxweb3/coin-bitcoin": "^2.0.0",
  "@okxweb3/coin-solana": "^2.0.0",
  "@okxweb3/coin-base": "^2.0.0",
  "@okxweb3/crypto-lib": "^2.0.0",
  "@sinclair/typebox": "^0.34.48",
  "ethers": "^6.13.0"
}
```

## 📞 技术支持

遇到问题？查看：
1. [使用指南](./README_USAGE.md) - 详细的 API 文档
2. [部署指南](./DEPLOYMENT_GUIDE.md) - 配置和故障排查
3. [实现总结](./IMPLEMENTATION_SUMMARY.md) - 技术细节

## 📝 更新日志

### v1.1.0 (2026-03-11)

**新功能:**
- ✅ 集成 Infura 作为主要 RPC 提供商
- ✅ 支持 14+ 条链的自动 RPC 配置
- ✅ 智能 RPC 选择（Infura → 公共端点）
- ✅ 通过 chainId 参数轻松切换网络
- ✅ 添加 INFURA_CONFIG.md 配置文档

**改进:**
- 🔄 优化 getProvider 函数支持多链
- 📖 更新所有工具的参数描述
- 🌐 添加 Infura 网络映射表

### v1.0.0 (2026-03-11)

- ✅ 实现完整的 EVM 钱包功能
- ✅ 支持多账户管理
- ✅ ETH 和 ERC20 余额查询
- ✅ ETH 和 ERC20 转账
- ✅ Legacy 和 EIP-1559 交易
- ✅ 消息签名
- ✅ Bitcoin 和 Solana 地址生成
- ✅ 自动化测试脚本
- ✅ 完整的文档

## 📄 许可证

遵循 OpenClaw 项目许可证

---

**状态**: ✅ 生产就绪（EVM 部分）  
**版本**: 1.0.0  
**最后更新**: 2026-03-11

### extensions/wallet-manager/index.ts
实现了以下 4 个工具：
1. `wallet_generate_eth_address` - 使用 BIP44 路径生成以太坊地址
2. `wallet_sign_eth_transaction` - 签署以太坊交易
3. `wallet_generate_btc_address` - 使用 BIP44 路径生成比特币地址
4. `wallet_generate_sol_address` - 使用 BIP44 路径生成 Solana 地址

**重要变更**：
- 所有工具现在使用 **derivation path** 而不是直接的私钥参数
- 助记词必须通过 **环境变量 `WALLET_MNEMONIC`** 设置
- 已移除生成助记词的功能（出于安全考虑）

### skills/wallet-manager/SKILL.md
包含完整的使用文档：
- 工具说明
- 使用示例
- 安全注意事项
- 配置指南
- 常用派生路径

## 🚀 使用方式

### 配置环境变量

**必须**在运行 OpenClaw 之前设置助记词环境变量：

```bash
# 在 Docker 环境中
docker run -e WALLET_MNEMONIC="your twelve or twenty-four word mnemonic phrase here" ...

# 或在 docker-compose.yml 中
environment:
  - WALLET_MNEMONIC=your twelve or twenty-four word mnemonic phrase here

# 本地运行
export WALLET_MNEMONIC="your twelve or twenty-four word mnemonic phrase here"
```

### 使用工具

这些文件现在在你的本地项目中，你可以：

### 选项 1: 直接在本地 OpenClaw 中使用

如果你在本地运行 OpenClaw：
```bash
cd /Users/zhangleping/github.com/holynull/wlt-openclaw
# 确保这个项目是你的 OpenClaw workspace
openclaw gateway --port 18789
```

### 选项 2: 复制到远程服务器

已经完成！文件已经在远程服务器上了。

### 选项 3: 在 Docker 构建中使用

如果你想基于这个本地项目构建 Docker 镜像：
```bash
# 假设你有一个 Dockerfile
docker build --build-arg OPENCLAW_EXTENSIONS="wallet-manager" -t openclaw-wallet:latest .
```

## 📂 项目结构

```
/Users/zhangleping/github.com/holynull/wlt-openclaw/
├── extensions/
│   └── wallet-manager/          ✅ 本地扩展
│       ├── package.json
│       ├── openclaw.plugin.json
│       ├── index.ts
│       └── src/
├── skills/
│   └── wallet-manager/          ✅ 本地技能
│       └── SKILL.md
├── workspace/                   (OpenClaw workspace 配置)
├── agents/                      (Agent 配置)
├── openclaw.json               (主配置文件)
├── deploy-wallet-manager.sh    (一键部署脚本)
├── WALLET_DEPLOYMENT_GUIDE.md  (完整部署指南)
└── README_WALLET.md            (快速入门)
```

## 🔧 下一步

1. **如果需要在本地测试**，确保安装依赖：
   ```bash
   cd extensions/wallet-manager
   npm install
   ```

2. **更新 openclaw.json** 启用工具：
   ```json
   {
     "agents": {
       "list": [{
         "id": "main",
         "tools": {
           "allow": ["wallet-manager", ...]
         }
       }]
     }
   }
   ```

3. **同步到远程** (可选)：
   ```bash
   # 如果远程有更新，使用部署脚本
   ./deploy-wallet-manager.sh
   ```

## 📝 注意

- 本地和远程的文件内容完全相同
- 所有工具都标记为 `optional: true`，需要显式启用
- 私钥等敏感信息不会被日志记录
- 建议在测试网上先测试所有功能
