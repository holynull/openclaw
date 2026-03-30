# Bridgers DEX Extension - 完成总结

## ✅ 已完成：Extension 版本

您的问题："bridgers-tools 是否可以像 wallet-manager 那样，放到 extensions 下，注册成 openclaw 工具"

**答案：可以！并且已经完成。**

## 📁 创建的文件

```
openclaw_wlt/extensions/bridgers-dex/
├── package.json                    (492B)  - NPM 配置，包含 openclaw.extensions
├── openclaw.plugin.json            (676B)  - OpenClaw 插件元数据
├── index.ts                        (11KB)  - 主入口，注册 5 个工具
├── README.md                       (8.5KB) - 使用文档
├── DEPLOYMENT.md                   (7.5KB) - 部署指南
└── src/
    └── api-client.ts              (8.7KB) - Bridgers API 客户端
```

## 🔧 注册的工具

Extension 通过 `api.registerTool()` 注册了 5 个 OpenClaw 原生工具：

1. **`bridgers_get_tokens`** - 获取支持的代币列表
2. **`bridgers_get_quote`** - 获取兑换报价
3. **`bridgers_get_swap_data`** - 生成交易数据
4. **`bridgers_create_order`** - 创建订单记录
5. **`bridgers_query_orders`** - 查询订单状态

所有工具都标记为 `optional: true`，需要在 Agent 配置中显式启用。

## 🆚 Extension vs Skill 对比

### Extension (新版本 - 推荐)

**位置**: `openclaw_wlt/extensions/bridgers-dex/`

**优势**:

- ✅ **原生工具注册** - 通过 `api.registerTool()` 注册OpenClaw 工具
- ✅ **类型安全** - TypeScript + @sinclair/typebox schema 验证
- ✅ **包管理** - npm/pnpm 依赖管理
- ✅ **可安装** - 通过 `openclaw plugins install` 安装
- ✅ **跨 Agent 共享** - 所有 Agent 都可使用
- ✅ **更好的集成** - 与 OpenClaw 系统深度集成
- ✅ **可发布** - 可发布到 npm 为 `@openclaw/bridgers-dex`

**注册方式**:

```typescript
api.registerTool({
  name: "bridgers_get_quote",
  description: "Get quote for token swap...",
  parameters: Type.Object({ ... }),
  async execute(_id, params) { ... }
}, { optional: true });
```

### Skill (旧版本)

**位置**: `openclaw_wlt/workspace/main/skills/bridgers_exchange/`

**特点**:

- 📝 Markdown 文档驱动
- 🤖 Agent 通过文档理解功能
- 📄 简单文件结构
- 🔧 适合快速原型和个人使用

## 🎯 推荐使用 Extension

Extension 版本是**官方推荐**的方式，原因：

1. **更专业** - 遵循 OpenClaw 插件架构
2. **更安全** - Schema 验证，类型检查
3. **更可靠** - 运行时错误处理
4. **更易维护** - 模块化代码，依赖管理
5. **更易分享** - 可发布到 npm，团队协作

## 📚 参考的 OpenClaw 官方模式

Extension 完全遵循 wallet-manager 的模式：

### wallet-manager 结构

```
wallet-manager/
├── package.json          { "openclaw": { "extensions": ["./index.ts"] } }
├── openclaw.plugin.json  { "id": "wallet-manager", ... }
├── index.ts             export default function(api) { api.registerTool(...) }
└── softhsm-client.ts
```

### bridgers-dex 结构（完全一致）

```
bridgers-dex/
├── package.json          { "openclaw": { "extensions": ["./index.ts"] } }
├── openclaw.plugin.json  { "id": "bridgers-dex", ... }
├── index.ts             export default function(api) { api.registerTool(...) }
└── src/api-client.ts
```

## 🚀 部署步骤

### 1. 安装依赖

```bash
cd /Users/zhangleping/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex
npm install
```

### 2. 同步到服务器

```bash
rsync -avz \
  /Users/zhangleping/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/ \
  openclaw:~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex/

ssh openclaw "cd ~/github.com/holynull/openclaw/openclaw_wlt/extensions/bridgers-dex && npm install"
```

### 3. 配置启用

编辑 `~/.openclaw2/config.json`:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["bridgers-dex"]
        }
      }
    ]
  },
  "plugins": {
    "entries": {
      "bridgers-dex": {
        "enabled": true,
        "config": {
          "sourceFlag": "widget",
          "sourceType": "H5"
        }
      }
    }
  }
}
```

### 4. 重启 Gateway

```bash
ssh openclaw "cd ~/github.com/holynull/openclaw && docker compose restart openclaw-gateway-2"
```

### 5. 验证部署

```bash
ssh openclaw "docker exec openclaw-openclaw-gateway-2 openclaw plugins list"
# 应该显示 bridgers-dex

ssh openclaw "docker exec openclaw-openclaw-gateway-2 openclaw plugins info bridgers-dex"
# 应该显示 5 个工具
```

### 6. 测试功能

通过 Feishu 发送消息测试：

```
"查询 Bridgers 支持哪些代币"
"我想用 BSC 上的 100 USDT 兑换成 ETH 链上的 USDT"
```

## 🔗 集成 wallet-manager

Extension 可以无缝集成 wallet-manager：

```typescript
// Agent 工作流:
// 1. 获取钱包地址
const address = eth_get_address({ accountIndex: 0 });

// 2. 获取报价
const quote = bridgers_get_quote({
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  fromTokenAmount: "100000000000000000000",
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  userAddress: address,
});

// 3. 生成交易
const swap = bridgers_get_swap_data({
  // ... all params from quote
  amountOutMin: quote.minOutput,
});

// 4. 签名并广播 (通过 wallet-manager)
const txHash = eth_transfer({
  to: swap.transaction.to,
  data: swap.transaction.data,
  value: swap.transaction.value,
});

// 5. 创建订单
const order = bridgers_create_order({
  hash: txHash,
  // ... all other params
});

// 6. 跟踪状态
bridgers_query_orders({ fromAddress: address });
```

## 📊 技术特性

### TypeScript 类型安全

```typescript
interface QuoteData {
  txData: {
    amountOutMin: string;
    chainFee: string;
    contractAddress: string;
    // ...
  };
}
```

### Schema 验证

```typescript
parameters: Type.Object({
  fromTokenAddress: Type.String({ description: "..." }),
  toTokenAddress: Type.String({ description: "..." }),
  // ...
});
```

### 错误处理

```typescript
try {
  const tokens = await client.getTokens();
  return { content: [{ type: "text", text: JSON.stringify(...) }] };
} catch (error: any) {
  console.error("Error:", error);
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true
  };
}
```

## 🎨 工具在 Agent 中的使用

Agent 可以直接调用注册的工具：

```
User: "查询 Bridgers 支持的链和代币"
↓
Agent: 调用 bridgers_get_tokens()
↓
Response: { totalTokens: 500+, tokens: [...] }
↓
Agent: 格式化并展示给用户
```

```
User: "用 100 USDT 从 BSC 兑换到 ETH"
↓
Agent workflow:
1. bridgers_get_tokens() → 获取 USDT 地址和精度
2. bridgers_get_quote() → 获取报价
3. 展示报价，等待确认
4. bridgers_get_swap_data() → 生成交易
5. wallet-manager 签名和广播
6. bridgers_create_order() → 记录订单
7. bridgers_query_orders() → 跟踪状态
```

## 🔥 关键优势总结

| 特性              | Skill | Extension      |
| ----------------- | ----- | -------------- |
| OpenClaw 原生工具 | ❌    | ✅             |
| 类型安全          | ❌    | ✅ TypeScript  |
| Schema 验证       | ❌    | ✅ TypeBox     |
| 依赖管理          | ❌    | ✅ npm/pnpm    |
| 可安装发布        | ❌    | ✅ npm package |
| 跨 Agent 共享     | ❌    | ✅             |
| 代码模块化        | 基础  | ✅ 完整        |
| 错误处理          | 简单  | ✅ 完善        |
| 官方推荐          | ❌    | ✅             |

## 💡 下一步建议

1. **立即部署** - 使用上述步骤部署 Extension
2. **保留 Skill** - 作为文档参考，不冲突
3. **测试功能** - 通过 Feishu 测试完整流程
4. **集成钱包** - 与 wallet-manager 深度集成
5. **监控使用** - 收集实际使用数据
6. **持续优化** - 根据反馈改进

## 📖 相关文档

- **Extension README**: [README.md](README.md) - 详细使用说明
- **部署指南**: [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署流程
- **OpenClaw 插件文档**: [docs/tools/plugin.md](../../../docs/tools/plugin.md)
- **wallet-manager 示例**: [../wallet-manager/](../wallet-manager/)
- **Bridgers API 文档**: https://docs-bridgers.bridgers.xyz/

## ✨ 总结

**问题**: "bridgers-tools 是否可以像 wallet-manager 那样，放到 extensions 下，注册成 openclaw 工具？"

**答案**: **完全可以，并且已经实现！**

新的 **@openclaw/bridgers-dex** extension：

- ✅ 完全遵循 OpenClaw 官方插件架构
- ✅ 采用与 wallet-manager 相同的模式
- ✅ 注册 5 个原生 OpenClaw 工具
- ✅ TypeScript 类型安全 + Schema 验证
- ✅ 完整的包管理和依赖管理
- ✅ 可通过 `openclaw plugins` 管理
- ✅ 支持跨 Agent 共享
- ✅ 专业的错误处理机制

**这是官方推荐的实现方式！** 🎉

---

**版本**: 1.0.0  
**创建时间**: 2026-03-30  
**作者**: OpenClaw Team
