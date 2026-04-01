---
name: omnibridge_swap
description: Omnibridge cross-chain token swap platform for exchanging cryptocurrencies across 30+ blockchains
metadata: { "openclaw": { "emoji": "🌉", "requires": { "env": [] } } }
---

# Omnibridge Cross-Chain Swap

Cross-chain token swap operations using Omnibridge platform. Supports 30+ chains including BTC, ETH, BSC, TRON, Solana, Polygon, Avalanche, and more.

## 🔐 Security Notes

**CRITICAL SAFETY REQUIREMENTS:**

1. **ALWAYS** verify platform deposit address before sending tokens
2. **ALWAYS** check coin codes and amounts in order confirmation
3. **ALWAYS** validate quote and exchange rates
4. **NEVER** execute swaps without explicit user confirmation
5. **ALWAYS** save orderId for tracking
6. **ALWAYS** verify refund address matches user's wallet

## 📋 Swap Workflow

**Omnibridge uses a DIFFERENT workflow than other DEXes:**

1. User creates an order → Omnibridge provides a **platform deposit address**
2. User sends tokens to the **platform address** (not a smart contract)
3. User uploads transaction hash to notify Omnibridge
4. Omnibridge processes the swap and sends destination tokens
5. User tracks order status

## 🔄 MANDATORY SWAP FLOW

### Step 0: PREPARE WALLET INFO

**Get User's Wallet Address:**

```
eth_get_address({ accountIndex: 0 })
```

Returns: `{ address: "0x..." }`

### Step 1: QUERY SUPPORTED COINS

**Get coin list and identify exact coin codes:**

```
omnibridge_get_coins({ mainNetwork: "BSC" })
```

Returns array of coins:

```json
{
  "coinCode": "USDT",
  "coinName": "Tether USD",
  "mainNetwork": "BSC",
  "contact": "0x55d398326f99059ff775485246999027b3197955",
  "decimals": 18,
  "isSupportAdvanced": "Y"
}
```

**CRITICAL: Coin Code Format**

Omnibridge uses specific coin code formats:

- Native tokens: `"ETH"`, `"BTC"`, `"BNB(BSC)"`, `"SOL"`, `"TRX"`
- ERC20/BEP20 tokens: `"USDT(BSC)"`, `"USDT(ETH)"`, `"USDC(POLYGON)"`
- Format: `TOKEN(CHAIN)` where CHAIN is the `mainNetwork` value
- **IMPORTANT**: For quotes and orders, use format like `"USDT(BSC)"` not just `"USDT"`

**Coin Code Mapping Rules:**

1. If `coinCode` = "USDT" and `mainNetwork` = "BSC" → Use `"USDT(BSC)"`
2. If `coinCode` = "ETH" and `mainNetwork` = "ETH" → Use `"ETH"` (native token)
3. If `coinCode` = "BNB" and `mainNetwork` = "BSC" → Use `"BNB(BSC)"` (native token on BSC)

**⚠️ CRITICAL: How to Construct Coin Codes**

**NEVER guess or construct coin codes manually!** Always follow this process:

```javascript
// ❌ WRONG - DO NOT DO THIS:
const depositCoinCode = "USDT"; // Missing chain
const depositCoinCode = "BSC"; // Wrong format
const depositCoinCode = "usdt(bsc)"; // Wrong case

// ✅ CORRECT - Follow this process:
// Step 1: Get coin list for source chain
const bscCoins = await omnibridge_get_coins({ mainNetwork: "BSC" });

// Step 2: Find the exact coin
const usdtOnBsc = bscCoins.find((c) => c.coinCode === "USDT" && c.mainNetwork === "BSC");

// Step 3: Construct coin code: coinCode(mainNetwork)
const depositCoinCode = `${usdtOnBsc.coinCode}(${usdtOnBsc.mainNetwork})`;
// Result: "USDT(BSC)"

// Exception: Native tokens on their own chain use coin code only
const ethOnEth = ethCoins.find((c) => c.coinCode === "ETH");
const depositCoinCode = "ETH"; // Not "ETH(ETH)"
```

**Common Coin Code Patterns:**

| Coin  | Chain    | Correct Code       | Wrong Codes ❌                  |
| ----- | -------- | ------------------ | ------------------------------- |
| USDT  | BSC      | `"USDT(BSC)"`      | "USDT", "usdt(bsc)", "USDT-BSC" |
| USDT  | Ethereum | `"USDT(ETH)"`      | "USDT", "USDT(ETHEREUM)"        |
| USDC  | Polygon  | `"USDC(POLYGON)"`  | "USDC", "USDC(MATIC)"           |
| ETH   | Ethereum | `"ETH"`            | "ETH(ETH)", "ETHEREUM"          |
| BNB   | BSC      | `"BNB(BSC)"`       | "BNB", "BINANCE"                |
| MATIC | Polygon  | `"MATIC(POLYGON)"` | "MATIC", "POLYGON"              |

### Step 2: GET QUOTE

**Call `omnibridge_get_quote` to get exchange rate and fees:**

```
omnibridge_get_quote({
  depositCoinCode: "USDT(BSC)",       // ← Format: TOKEN(CHAIN)
  receiveCoinCode: "USDT(ETH)",       // ← Format: TOKEN(CHAIN)
  depositCoinAmt: "100",              // ← Amount WITHOUT decimals
  fixedRate: "N"
})
```

Returns:

```json
{
  "exchangeRate": "0.999",
  "platformFeeRate": "0.003", // 0.3%
  "chainFee": "0.0005", // Cross-chain fee
  "limits": {
    "min": "10",
    "max": "100000"
  },
  "burnRate": "0",
  "isSupport": true
}
```

**Calculate Expected Amounts:**

- Platform deducts fee from deposit: `actualDeposit = amount × (1 - feeRate)`
- Expected receive: `receiveAmount = actualDeposit × exchangeRate`
- Example: 100 USDT → 100 × 0.997 × 0.999 = 99.60 USDT

### Step 3: PRESENT QUOTE TO USER

```
🌉 Omnibridge 跨链兑换报价：

• 支付：{depositAmount} {depositCoin}
• 获得：~{expectedReceive} {receiveCoin}
• 兑换汇率：{exchangeRate}
• 平台费率：{platformFeeRate} (从存款中扣除)
• 跨链手续费：{chainFee}
• 兑换范围：{min} ~ {max}

⚠️ 请确认兑换金额在允许范围内。
⚠️ 跨链兑换需要时间，请确认地址无误。

继续创建订单？(输入"是"或"确认"继续)
```

### Step 4: WAIT FOR USER CONFIRMATION

```
User: "是" or "确认" or "yes"
↓
Proceed to create order
```

### Step 5: CREATE ORDER

**⚠️ CRITICAL: Use amounts WITHOUT decimals**

```
omnibridge_create_order({
  depositCoinCode: "USDT(BSC)",    // ← Same as quote
  receiveCoinCode: "USDT(ETH)",    // ← Same as quote
  depositCoinAmt: "100",           // ← WITHOUT decimals
  receiveCoinAmt: "99.60",         // ← Calculated from quote
  destinationAddr: userWalletAddress,  // ← Receiver address (destination chain)
  refundAddr: userWalletAddress,       // ← Refund address (source chain)
  slippage: "0.02",                    // ← 2% slippage
  fixedRate: "N"
})
```

Returns:

```json
{
  "orderId": "abc123-def456-...",
  "platformAddr": "0x3181af4f7cc7251a6a4eda75526c8abe10106db8",
  "depositCoinCode": "USDT(BSC)",
  "receiveCoinCode": "USDT(ETH)",
  "depositCoinAmt": "100",
  "receiveCoinAmt": "99.60",
  "orderState": "⏳ 等待用户存款",
  "createdAt": "2026-04-01 10:00:00"
}
```

### Step 6: PRESENT ORDER DETAILS TO USER

```
✅ 订单创建成功！

订单号：{orderId}
存款地址：{platformAddr}

📤 下一步操作：
1. 发送 {depositCoinAmt} {depositCoinCode} 到存款地址：
   {platformAddr}

2. 使用您的钱包发送交易

⚠️ 重要提示：
• 请确保发送正确的代币和数量
• 存款地址属于 Omnibridge 平台
• 发送完成后，请提供交易哈希以便追踪

准备好发送了吗？我可以帮您使用钱包发送。
```

### Step 7: SEND TOKENS TO PLATFORM ADDRESS

**User has two options:**

**Option A: Use their own wallet (MetaMask, etc.)**

User manually sends tokens and provides transaction hash.

**Option B: Use wallet-manager extension**

**For ERC20 tokens:**

```
eth_transfer({
  to: platformAddr,                  // ← Platform address from order
  amount: "100000000000000000000",   // ← Amount WITH decimals
  tokenAddress: "0x55d398326f99059ff775485246999027b3197955",  // ← Token contract
  chainId: 56,                       // ← BSC
  gasPreset: "medium",
  accountIndex: 0
})
```

**For native tokens (ETH, BNB, etc.):**

```
eth_send_transaction({
  to: platformAddr,
  value: "1000000000000000000",  // ← Amount WITH decimals (1 ETH = 10^18 wei)
  data: "0x",
  chainId: 1,  // ← Ethereum
  gasPreset: "medium",
  accountIndex: 0
})
```

Returns:

```json
{
  "transactionHash": "0xabcd...ef01",
  "status": "success",
  "blockNumber": 12345
}
```

### Step 8: UPLOAD TRANSACTION HASH

**After deposit transaction confirms:**

```
omnibridge_upload_tx({
  orderId: "abc123-def456-...",
  depositTxid: "0xabcd...ef01"
})
```

Returns:

```json
{
  "success": true,
  "result": "SUCCESS",
  "message": "Transaction hash uploaded successfully"
}
```

**Present confirmation:**

```
✅ 交易哈希已上传！

订单号：{orderId}
存款交易：{depositTxid}

🔄 Omnibridge 正在处理您的兑换...
预计完成时间：5-30 分钟（取决于链的确认速度）

您可以随时查询订单状态。
```

### Step 9: TRACK ORDER STATUS

**Query order status periodically:**

```
omnibridge_query_order({
  orderId: "abc123-def456-..."
})
```

Returns:

```json
{
  "orderId": "abc123-def456-...",
  "orderState": "🔄 处理中",
  "detailState": "等待兑换",
  "deposit": {
    "amount": "100",
    "coinCode": "USDT(BSC)",
    "txHash": "0xabcd...ef01",
    "explorer": "https://bscscan.com/tx/0xabcd...ef01"
  },
  "receive": {
    "amount": "99.60",
    "actualAmount": "99.58",
    "coinCode": "USDT(ETH)",
    "txHash": "0x1234...5678",
    "explorer": "https://etherscan.io/tx/0x1234...5678"
  }
}
```

**Order States:**

- `⏳ 等待用户存款`: User needs to send tokens
- `🔄 处理中`: Omnibridge is processing the swap
- `✅ 已完成`: Swap completed, tokens sent
- `⏱️ 已超时`: Order timed out
- `↩️ 已退款`: Swap failed, tokens refunded

## 🛑 Error Handling

### Common API Error Codes

| Error Code | Error Message        | Root Cause                 | Solution                                                           |
| ---------- | -------------------- | -------------------------- | ------------------------------------------------------------------ |
| `914`      | "接收货币币种不存在" | Invalid coin code format   | Use exact format from `omnibridge_get_coins`: `"TOKEN(CHAIN)"`     |
| `915`      | "存款货币币种不存在" | Invalid deposit coin code  | Verify coin code matches API response exactly                      |
| `916`      | "不支持该交易对"     | Trading pair not supported | Check both coins support advanced swaps (`isSupportAdvanced: "Y"`) |
| `900`      | General error        | Various issues             | Check all parameters match API requirements                        |

### Error: "接收货币币种不存在" (Code 914)

**Symptom:**

```
Error: Omnibridge API error: 接收货币币种不存在
resCode: "914"
```

**Root Cause:** Incorrect coin code format

**Common Mistakes:**

```javascript
❌ omnibridge_get_quote({
  depositCoinCode: "USDT",        // Missing chain
  receiveCoinCode: "ETH"          // May be OK for native tokens
})

❌ omnibridge_get_quote({
  depositCoinCode: "USDT(bsc)",   // Wrong case
  receiveCoinCode: "USDT(eth)"
})

❌ omnibridge_get_quote({
  depositCoinCode: "BSC-USDT",    // Wrong format
  receiveCoinCode: "ETH-USDT"
})
```

**Correct Solution:**

```javascript
// Step 1: Get coin list
const bscCoins = await omnibridge_get_coins({ mainNetwork: "BSC" });
const ethCoins = await omnibridge_get_coins({ mainNetwork: "ETH" });

// Step 2: Find coins
const usdtBsc = bscCoins.find(c => c.coinCode === "USDT");
const usdtEth = ethCoins.find(c => c.coinCode === "USDT");

// Step 3: Construct with exact format
✅ omnibridge_get_quote({
  depositCoinCode: "USDT(BSC)",   // TOKEN(CHAIN)
  receiveCoinCode: "USDT(ETH)",   // TOKEN(CHAIN)
  depositCoinAmt: "100"
})
```

**IF quote fails:**

- ⚠️ **FIRST**: Check coin code format matches `"TOKEN(CHAIN)"` exactly
- Call `omnibridge_get_coins` for both chains to verify coin codes
- Verify amount is within min/max range
- Check if chains support cross-chain swaps
- Ensure `isSupportAdvanced === "Y"` for both coins

**IF order creation fails:**

- Verify coin codes are correct (format: "TOKEN(CHAIN)")
- Check if amounts are valid (WITHOUT decimals)
- Ensure destination address is valid
- Confirm coin codes match those used in successful quote

**IF deposit transaction fails:**

- Verify platform address from order response
- Check wallet has sufficient balance
- Ensure correct token/amount is being sent
- Confirm gas fee is sufficient

**IF order times out:**

- Contact Omnibridge support with orderId
- Refund will be processed automatically to refundAddr

## 📊 Complete Examples

### Example 1: Swap 100 USDT from BSC to Ethereum

```
User: "我想把 BSC 上的 100 USDT 兑换到以太坊上"

Agent Steps:

Step 0: Get wallet address
  eth_get_address({ accountIndex: 0 })
  → Returns: "0x1234...5678"

Step 1: Query coins and identify coin codes
  omnibridge_get_coins({ mainNetwork: "BSC" })
  → Find USDT on BSC: coinCode "USDT", mainNetwork "BSC", contact "0x55d3...", decimals 18
  → Use coin code: "USDT(BSC)"

  omnibridge_get_coins({ mainNetwork: "ETH" })
  → Find USDT on ETH: coinCode "USDT", mainNetwork "ETH", contact "0xdac1...", decimals 6
  → Use coin code: "USDT(ETH)"

Step 2: Get quote
  omnibridge_get_quote({
    depositCoinCode: "USDT(BSC)",
    receiveCoinCode: "USDT(ETH)",
    depositCoinAmt: "100",
    fixedRate: "N"
  })
  → Returns:
    {
      "exchangeRate": "0.999",
      "platformFeeRate": "0.003",
      "chainFee": "0.0005",
      "limits": { "min": "10", "max": "100000" }
    }
  → Calculate: 100 × (1 - 0.003) × 0.999 = 99.60 USDT

Step 3: Present quote
  Agent: "🌉 Omnibridge 跨链兑换报价：
         • 支付：100 USDT(BSC)
         • 获得：~99.60 USDT(ETH)
         • 兑换汇率：0.999
         • 平台费率：0.3%
         • 跨链手续费：0.0005

         继续创建订单？"

Step 4: Wait for confirmation
  User: "确认"

Step 5: Create order
  omnibridge_create_order({
    depositCoinCode: "USDT(BSC)",
    receiveCoinCode: "USDT(ETH)",
    depositCoinAmt: "100",
    receiveCoinAmt: "99.60",
    destinationAddr: "0x1234...5678",
    refundAddr: "0x1234...5678",
    slippage: "0.02",
    fixedRate: "N"
  })
  → Returns:
    {
      "orderId": "abc123-def456",
      "platformAddr": "0x3181af4f7cc7251a6a4eda75526c8abe10106db8",
      "orderState": "⏳ 等待用户存款"
    }

Step 6: Present order details
  Agent: "✅ 订单创建成功！
         订单号：abc123-def456
         存款地址：0x3181...106db8

         请发送 100 USDT(BSC) 到存款地址。
         我可以帮您使用钱包发送。"

  User: "好的，帮我发送"

Step 7: Send tokens
  eth_transfer({
    to: "0x3181af4f7cc7251a6a4eda75526c8abe10106db8",
    amount: "100000000000000000000",  // 100 USDT with 18 decimals
    tokenAddress: "0x55d398326f99059ff775485246999027b3197955",
    chainId: 56,
    gasPreset: "medium",
    accountIndex: 0
  })
  → Returns: { transactionHash: "0xabcd...ef01", status: "success" }

Step 8: Upload transaction hash
  omnibridge_upload_tx({
    orderId: "abc123-def456",
    depositTxid: "0xabcd...ef01"
  })
  → Returns: { success: true, result: "SUCCESS" }

Step 9: Inform user
  Agent: "✅ 交易哈希已上传！
         订单号：abc123-def456
         存款交易：0xabcd...ef01

         Omnibridge 正在处理您的兑换，预计 10-30 分钟完成。
         您可以随时查询订单状态。"

Later: Track order status
  omnibridge_query_order({ orderId: "abc123-def456" })
  → Returns order status with transaction details
```

### Example 2: Swap 0.1 ETH to BNB on BSC

```
User: "把 0.1 个 ETH 换成 BSC 上的 BNB"

Agent Steps:

Step 0: Get wallet
  eth_get_address({ accountIndex: 0 })
  → "0x1234...5678"

Step 1: Query coins
  omnibridge_get_coins({ mainNetwork: "ETH" })
  → ETH (native): coinCode "ETH", mainNetwork "ETH"
  → Use: "ETH"

  omnibridge_get_coins({ mainNetwork: "BSC" })
  → BNB: coinCode "BNB", mainNetwork "BSC"
  → Use: "BNB(BSC)"

Step 2: Get quote
  omnibridge_get_quote({
    depositCoinCode: "ETH",
    receiveCoinCode: "BNB(BSC)",
    depositCoinAmt: "0.1",
    fixedRate: "N"
  })
  → Returns:
    {
      "exchangeRate": "6.5",  // 1 ETH = 6.5 BNB
      "platformFeeRate": "0.003",
      "chainFee": "0.002"
    }
  → Calculate: 0.1 × (1 - 0.003) × 6.5 = 0.648 BNB

Step 3-5: Quote, confirmation, create order
  (Similar to Example 1)
  → Get platformAddr: "0x3181...106db8"

Step 6: Send ETH (native token)
  eth_send_transaction({
    to: "0x3181af4f7cc7251a6a4eda75526c8abe10106db8",
    value: "100000000000000000",  // 0.1 ETH = 0.1 × 10^18 wei
    data: "0x",
    chainId: 1,  // Ethereum mainnet
    gasPreset: "medium",
    accountIndex: 0
  })
  → Returns: { transactionHash: "0x9876...1234" }

Step 7: Upload hash
  omnibridge_upload_tx({
    orderId: "xyz789-abc123",
    depositTxid: "0x9876...1234"
  })

Step 8: Track order
  omnibridge_query_order({ orderId: "xyz789-abc123" })
```

### Example 3: Swap USDT from Polygon to TRON

```
User: "Polygon 上的 50 USDT 换成波场上的 USDT"

Coin codes:
- Source: "USDT(POLYGON)" (mainNetwork: "MATIC" or "POLYGON")
- Destination: "USDT(TRON)" (mainNetwork: "TRON")

Quote → Create Order → Send to platform address → Upload hash → Track

(Follow same workflow as Example 1)
```

## 🔧 Amount Conversion Guide

**Omnibridge uses TWO different amount formats:**

1. **Quote & Create Order**: Amounts **WITHOUT** decimals
   - Example: "100" for 100 USDT
   - Example: "0.1" for 0.1 ETH

2. **Send Transaction**: Amounts **WITH** decimals
   - USDT (18 decimals): "100000000000000000000" for 100 USDT
   - USDT (6 decimals): "100000000" for 100 USDT
   - ETH (18 decimals): "100000000000000000" for 0.1 ETH

**Conversion Formula:**

```
amountWithDecimals = amount × (10 ** decimals)

Examples:
- 100 USDT × 10^18 = "100000000000000000000"
- 0.1 ETH × 10^18 = "100000000000000000"
- 50 USDT(POLYGON) × 10^6 = "50000000"
```

## 📝 Important Notes

### Coin Code Guidelines

1. **Always use format `TOKEN(CHAIN)` for API calls**
   - Correct: `"USDT(BSC)"`, `"USDT(ETH)"`, `"BNB(BSC)"`
   - Exception: Native tokens on their own chain: `"ETH"`, `"BTC"`, `"SOL"`

2. **Get exact coin codes from `omnibridge_get_coins`**
   - Don't guess or construct coin codes
   - Match `coinCode` + `mainNetwork` fields

### Amount Guidelines

1. **Quote & Order**: Use readable amounts WITHOUT decimals
2. **Send Transaction**: Use full amounts WITH decimals
3. **Always check decimals** from coin info: `coinDecimal` field

### Address Guidelines

1. **destinationAddr**: Receiver address on **destination chain**
2. **refundAddr**: Refund address on **source chain** (usually same as sender)
3. **platformAddr**: Omnibridge deposit address (from order response)

### Transaction Types

1. **ERC20/BEP20 tokens**: Use `eth_transfer` with `tokenAddress`
2. **Native tokens**: Use `eth_send_transaction` with `value` and `data: "0x"`

### Order Tracking

1. **Always save orderId** from create_order response
2. **Upload transaction hash** immediately after sending deposit
3. **Query order status** periodically (every 2-5 minutes)
4. **Expected completion time**: 5-30 minutes depending on chains

## 🚨 Common Mistakes to Avoid

### ⚠️ #1 MOST COMMON: Wrong Coin Code Format

**This is the #1 cause of API errors!**

| ❌ Wrong       | ✅ Correct    | Why                                       |
| -------------- | ------------- | ----------------------------------------- |
| `"USDT"`       | `"USDT(BSC)"` | Missing chain identifier                  |
| `"usdt(bsc)"`  | `"USDT(BSC)"` | Wrong case (must be uppercase)            |
| `"USDT-BSC"`   | `"USDT(BSC)"` | Wrong separator (use parentheses)         |
| `"BSC"`        | `"USDT(BSC)"` | Only chain name, missing token            |
| `"BNB"` on BSC | `"BNB(BSC)"`  | Native token needs chain for clarity      |
| `"ETH(ETH)"`   | `"ETH"`       | Native token on own chain uses short form |

**Prevention:**

```javascript
// ALWAYS get coin codes from API, NEVER construct manually
const coins = await omnibridge_get_coins({ mainNetwork: "BSC" });
const usdt = coins.find((c) => c.coinCode === "USDT");
const coinCode = `${usdt.coinCode}(${usdt.mainNetwork})`; // "USDT(BSC)"
```

### Other Common Mistakes:

2. ❌ **Sending to wrong address** - Send to `platformAddr` (from order), not `destinationAddr`
3. ❌ **Using wrong amount format** - Use amounts WITHOUT decimals in order creation
4. ❌ **Forgetting to upload transaction hash** - Call `omnibridge_upload_tx` after deposit
5. ❌ **Not checking min/max limits** - Verify amount is within limits from quote
6. ❌ **Using wrong chain ID** - Match chain ID to the source chain, not destination
7. ❌ **Not verifying platform address** - Always double-check before sending tokens

## ✅ Best Practices

### Coin Code Handling:

1. ✅ **ALWAYS** call `omnibridge_get_coins` first to get exact coin codes
2. ✅ **NEVER** manually construct coin codes - use values from API response
3. ✅ **VERIFY** coin code format is `"TOKEN(CHAIN)"` before calling quote
4. ✅ **CHECK** `isSupportAdvanced === "Y"` before attempting swap

### Workflow:

5. ✅ Always call `omnibridge_get_quote` before creating order
6. ✅ Present quote details and wait for user confirmation
7. ✅ Double-check platform address from order response
8. ✅ Verify token contract address and chain ID match source chain
9. ✅ Upload transaction hash immediately after deposit
10. ✅ Track order status and inform user of progress
11. ✅ Save all transaction hashes and order IDs for user reference

### Error Handling:

12. ✅ Handle API errors gracefully with clear user messages
13. ✅ If error code 914/915, re-check coin codes and retry
14. ✅ Provide fallback suggestions when coins not supported

## 📞 Support

If order is stuck or has issues:

1. Check order status with `omnibridge_query_order`
2. Verify deposit transaction confirmed on blockchain
3. Ensure transaction hash was uploaded correctly
4. Wait for processing (can take up to 30 minutes)
5. If order times out, refund will be processed automatically
6. Contact Omnibridge support: https://docs.en.omnibridge.pro/

## 🔗 Resources

- API Documentation: https://docs.en.omnibridge.pro/cross-chain-swap-api
- Supported Chains: 30+ including BTC, ETH, BSC, TRON, Solana, Polygon, Avalanche
- Platform Fee: 0.3% (deducted from deposit)
- Cross-chain Fee: Varies by chain pair
