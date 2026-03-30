# @openclaw/bridgers-dex

Bridgers DEX extension for OpenClaw - enables cross-chain token swaps across 39+ blockchains.

## 🌟 Features

- **39+ Chains Supported**: ETH, BSC, Polygon, Arbitrum, Optimism, Avalanche, Solana, Tron, and more
- **Cross-Chain Swaps**: Seamlessly swap tokens between different blockchains
- **Integrated Tools**: 5 registered tools for quotes, swaps, and order tracking
- **Type-Safe**: Full TypeScript support with schema validation
- **Security**: Optional tool registration (must be explicitly enabled)

## 📦 Installation

### Method 1: From Repository (Recommended for Development)

```bash
# Navigate to extensions directory
cd ~/.openclaw2/extensions

# Copy extension directory
cp -r /path/to/openclaw_wlt/extensions/bridgers-dex ./

# Install dependencies
cd bridgers-dex
npm install
```

### Method 2: Via OpenClaw CLI (When Published)

```bash
openclaw plugins install @openclaw/bridgers-dex
```

### Restart Gateway

After installation, restart the OpenClaw gateway:

```bash
# If using Docker Compose
docker compose restart openclaw-gateway-2

# If using systemd or other service manager
openclaw gateway restart
```

## ⚙️ Configuration

Enable the tools in your agent configuration:

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
          "sourceType": "H5",
          "equipmentNo": ""
        }
      }
    }
  }
}
```

## 🔧 Available Tools

### 1. `bridgers_get_tokens`

Get list of all supported tokens across all chains.

**Parameters**: None

**Returns**: List of tokens with chain, symbol, address, and decimals

**Example Usage**:

```
User: "查询 Bridgers 支持哪些代币"
Agent calls: bridgers_get_tokens()
```

### 2. `bridgers_get_quote`

Get quote for token swap including expected output, fees, and limits.

**Parameters**:

- `fromTokenAddress`: Source token contract address
- `toTokenAddress`: Destination token contract address
- `fromTokenAmount`: Amount WITH decimals (string)
- `fromTokenChain`: Source chain (e.g., "BSC", "ETH")
- `toTokenChain`: Destination chain
- `userAddress`: User wallet address

**Returns**: Quote with expected output, fees, min/max limits

**Example Usage**:

```
User: "我想用 BSC 上的 100 USDT 兑换 ETH 链上的 USDT"
Agent:
1. Calls bridgers_get_tokens to find USDT addresses
2. Calls bridgers_get_quote with parameters
3. Presents quote to user for confirmation
```

### 3. `bridgers_get_swap_data`

Generate transaction data for swap execution.

**Parameters**:

- `fromTokenAddress`, `toTokenAddress`
- `fromAddress`, `toAddress` (wallet addresses)
- `fromTokenChain`, `toTokenChain`
- `fromTokenAmount`, `amountOutMin` (from quote)
- `fromCoinCode`, `toCoinCode` (e.g., "USDT(BSC)")

**Returns**: Transaction object with `to`, `data`, `value` fields

**Next Steps**:

1. Sign transaction with wallet
2. Broadcast to network
3. Call `bridgers_create_order` with tx hash

### 4. `bridgers_create_order`

Create order record after broadcasting transaction.

**Parameters**:

- `hash`: Transaction hash (REQUIRED)
- All same parameters as `bridgers_get_swap_data`

**Returns**: `orderId` for tracking

### 5. `bridgers_query_orders`

Query order history and status.

**Parameters**:

- `fromAddress`: Optional wallet address
- `pageNo`: Optional page number (default: 1)
- `pageSize`: Optional page size (default: 10)

**Returns**: List of orders with status, amounts, and transaction links

## 🔄 Complete Workflow Example

```
User: "用我的钱包兑换 100 USDT 从 BSC 到 ETH"

Agent Workflow:
1. Get user wallet address (from wallet-manager or user input)
2. Call bridgers_get_tokens() to find USDT on BSC and ETH
3. Convert 100 USDT to amount with decimals (100 * 10^18 for BSC)
4. Call bridgers_get_quote() with parameters
5. Present quote to user:
```

🔄 兑换报价：
• 支付：100 USDT (BSC)
• 获得：~99.8 USDT (ETH)
• 最小获得：99.5 USDT
• 平台费率：0.2%
• 链上手续费：0.002 BNB

确认执行兑换？(输入"是"或"确认")

```
6. Wait for user confirmation
7. Call bridgers_get_swap_data() to generate transaction
8. Sign and broadcast transaction (via wallet-manager)
9. Call bridgers_create_order() with tx hash
10. Provide orderId to user for tracking
11. (Optional) Poll bridgers_query_orders() to show status updates
```

## 🔗 Integration with wallet-manager

Bridgers DEX extension works seamlessly with the `wallet-manager` extension:

```javascript
// 1. Get wallet address
const address = await wallet_manager.eth_get_address({ accountIndex: 0 });

// 2. Get quote
const quote = await bridgers_get_quote({
  fromTokenAddress: "0x55d398326f99059ff775485246999027b3197955",
  toTokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  fromTokenAmount: "100000000000000000000",
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  userAddress: address,
});

// 3. Get swap data
const swapData = await bridgers_get_swap_data({
  // ... quote parameters
  amountOutMin: quote.minOutput,
});

// 4. Sign and broadcast with wallet-manager
// (Implementation depends on wallet-manager capabilities)

// 5. Track order
const order = await bridgers_create_order({
  hash: txHash,
  // ... other parameters
});
```

## 📊 Supported Chains

**EVM Chains** (use 0xeeee...eeee for native tokens):

- Ethereum (ETH)
- BNB Smart Chain (BSC, BNB)
- Polygon (POLYGON, MATIC)
- Arbitrum (ARBITRUM)
- Optimism (OPTIMISM)
- Avalanche C-Chain (AVALANCHE, AVAX)
- Base (BASE)
- Linea (LINEA)
- Scroll (SCROLL)
- zkSync Era (ZKSYNC)
- Fantom (FANTOM)
- And more...

**Non-EVM Chains**:

- Solana (SOLANA)
- Tron (TRON)
- TON (TON)
- XRP (XRP)

Full list: https://docs-bridgers.bridgers.xyz/

## ⚠️ Important Notes

### Token Decimals

Different chains may have different decimals for the same token:

- **USDT (ETH)**: 6 decimals
- **USDT (BSC)**: 18 decimals
- **USDT (Polygon)**: 6 decimals

Always check token decimals via `bridgers_get_tokens()` before conversions.

### Native Token Address

Use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` for native tokens (ETH, BNB, MATIC, etc.)

### Amount Validation

Swap amounts must be within `depositMin` and `depositMax` from the quote. Always validate before proceeding.

### Irreversibility

**Cross-chain swaps cannot be reversed.** Always:

1. Show complete details to user
2. Wait for explicit confirmation
3. Double-check addresses and amounts

## 🐛 Troubleshooting

### Tools Not Available

1. Check plugin is enabled:

   ```bash
   openclaw plugins list
   ```

2. Verify in config:

   ```json
   {
     "plugins": {
       "entries": {
         "bridgers-dex": {
           "enabled": true
         }
       }
     }
   }
   ```

3. Check agent allowlist:
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
     }
   }
   ```

### API Errors

- **Quote fails**: Check if token is supported on both chains
- **Swap fails**: Verify amount is within min/max limits
- **Order not found**: Ensure transaction hash is correct

### Installation Issues

```bash
# Verify extension location
ls ~/.openclaw2/extensions/bridgers-dex/

# Check dependencies
cd ~/.openclaw2/extensions/bridgers-dex
npm list

# Reinstall if needed
rm -rf node_modules
npm install
```

## 📚 API Documentation

Full Bridgers API documentation: https://docs-bridgers.bridgers.xyz/

## 📝 Development

### Structure

```
bridgers-dex/
├── package.json              # NPM package config
├── openclaw.plugin.json      # Plugin metadata
├── index.ts                  # Main entry, tool registration
├── src/
│   └── api-client.ts        # Bridgers API client
└── README.md                # This file
```

### Adding New Tools

1. Add new method to `BridgersClient` in `api-client.ts`
2. Register tool in `index.ts` using `api.registerTool()`
3. Update README with usage examples

### Testing

```bash
# In OpenClaw workspace
openclaw agent --local --message "查询 Bridgers 支持的代币"
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file

## 🔗 Links

- [Bridgers Website](https://bridgers.xyz/)
- [Bridgers API Docs](https://docs-bridgers.bridgers.xyz/)
- [OpenClaw Docs](https://docs.openclaw.ai/)

---

**Version**: 1.0.0  
**Author**: OpenClaw Team  
**Last Updated**: 2026-03-30
