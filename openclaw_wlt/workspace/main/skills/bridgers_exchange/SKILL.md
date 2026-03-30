---
name: bridgers_exchange
description: Bridgers decentralized exchange platform for cross-chain token swaps
metadata: { "openclaw": { "emoji": "🔄", "requires": { "env": [] } } }
---

# Bridgers Exchange

Cross-chain token swap operations using Bridgers decentralized exchange platform. Supports 39+ chains including ETH, BSC, Polygon, Arbitrum, Optimism, Avalanche, Solana, Tron, and more.

## 🔐 Security Notes

**CRITICAL SAFETY REQUIREMENTS:**

1. **ALWAYS** verify wallet addresses before executing swaps
2. **ALWAYS** check token contract addresses against official sources
3. **ALWAYS** validate slippage tolerance and min return amounts
4. **NEVER** execute swaps without explicit user confirmation
5. **ALWAYS** present detailed swap summary before execution

## 📋 Swap Confirmation Protocol

**MANDATORY PREPARATION STEPS (BEFORE GETTING QUOTE):**

### Step 0: PREPARE WALLET AND TOKEN INFO

**CRITICAL: Always execute these steps FIRST:**

1. **Get User's Wallet Address**

   ```
   eth_get_address({ accountIndex: 0 })
   ```

   Returns: `{ address: "0x..." }`

2. **Query Token Information** (if user provides token symbol)

   ```
   bridgers_get_tokens()
   ```

   Returns array of TokenInfo:

   ```json
   {
     "chain": "POLYGON", // ← Use this EXACT value for fromTokenChain/toTokenChain
     "symbol": "USDT",
     "name": "Tether USD",
     "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // ← Use this for token address
     "decimals": 6, // ← Use this for amount calculation
     "logoURI": "https://...",
     "isCrossEnable": "1",
     "withdrawGas": "35"
   }
   ```

   **SEARCH RULES:**
   - Find token by matching: `symbol === "USDT"` AND `chain === "POLYGON"`
   - Store the EXACT values from the response
   - DO NOT modify chain names (use "POLYGON", not "Polygon" or "Matic")

**CRITICAL PARAMETER CONSISTENCY RULES:**

1. **Token Addresses:**
   - ⚠️ **ONLY** use `address` field from TokenInfo
   - ⚠️ **NEVER** use token symbols as addresses
   - ⚠️ **NEVER** use wallet address as token address
   - ⚠️ Native tokens (ETH/BNB/MATIC): use `"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"`

2. **Chain Names:**
   - ⚠️ **ONLY** use `chain` field from TokenInfo (EXACT string)
   - ⚠️ **NEVER** modify or translate chain names
   - ⚠️ Examples: use "BSC" not "BNB Chain", "POLYGON" not "Matic"

3. **Token Amounts:**
   - ⚠️ **ALWAYS** multiply by 10^decimals from TokenInfo
   - ⚠️ Example: 10 USDT with 6 decimals → "10000000"
   - ⚠️ Example: 100 USDT with 18 decimals → "100000000000000000000"

4. **Parameter Flow:**
   ```
   getTokens() → TokenInfo.chain → quote.fromTokenChain → swapData.fromTokenChain
   getTokens() → TokenInfo.address → quote.fromTokenAddress → swapData.fromTokenAddress
   getTokens() → TokenInfo.decimals → calculate fromTokenAmount → quote/swapData
   ```

**MANDATORY 4-STEP SWAP FLOW:**

### Step 1: GET QUOTE (REQUIRED FIRST)

Call `bridgers_get_quote` with:

- fromTokenAddress (ERC20 contract address, NOT wallet address, NOT symbol)
- toTokenAddress (ERC20 contract address, NOT wallet address, NOT symbol)
- fromTokenAmount (with decimals, e.g., "10000000" for 10 USDT with 6 decimals)
- fromTokenChain (exact chain code from bridgers_get_tokens, e.g., "BSC", "POLYGON")
- toTokenChain (exact chain code from bridgers_get_tokens)
- userAddress (wallet address from eth_get_address)

**Returns:**

```json
{
  "amountOutMin": "expected amount (with decimals)",
  "toTokenAmount": "expected amount (without decimals)",
  "chainFee": "network gas fee",
  "fee": "0.002 (0.2% platform fee)",
  "depositMin": "minimum swap amount",
  "depositMax": "maximum swap amount",
  "contractAddress": "Bridgers contract address"
}
```

### Step 2: PRESENT QUOTE TO USER

```
🔄 Bridgers 兑换报价：

• 支付：{fromAmount} {fromToken} ({fromChain})
• 获得：~{toAmount} {toToken} ({toChain})
• 最小获得：{amountOutMin} (含滑点保护)
• 平台费率：{fee}%
• 链上手续费：{chainFee}
• 兑换范围：{depositMin} ~ {depositMax}

⚠️ 请确认兑换金额在允许范围内。
⚠️ 跨链兑换不可逆，请仔细核对链和地址。

继续执行兑换？(输入"是"或"确认"继续)
```

### Step 3: WAIT FOR USER CONFIRMATION

```
User: "是" or "确认" or "yes"
↓
Proceed to execute swap
```

### Step 4: EXECUTE SWAP TRANSACTION

**⚠️ CRITICAL: All parameters MUST exactly match the values used in Step 0 and Step 1**

**⚠️ MANDATORY: For ERC20 tokens, MUST approve before swap**

**Complete Workflow:**

**A. Check and Execute Token Approval (REQUIRED for ERC20)**

⚠️ **SKIP THIS ONLY IF:**

- Swapping native tokens (ETH, BNB, MATIC, etc.)
- Token is already approved (check allowance first)

1.  Check current allowance:
    ```
    eth_get_token_allowance({
      tokenAddress: "0xc2132...",      // ← from TokenInfo.address (Step 0)
      ownerAddress: walletAddress,     // ← from eth_get_address (Step 0)
      spenderAddress: bridgersContractAddress,  // ← from quote response contractAddress
      chainId: 137                     // ← Polygon
    })
    ```
2.  If allowance < fromTokenAmount, approve:

    ```
    eth_approve_token({
      tokenAddress: "0xc2132...",      // ← from TokenInfo.address (Step 0)
      spenderAddress: bridgersContractAddress,  // ← from quote response
      amount: "1000000",               // ← SAME as quote fromTokenAmount
      chainId: 137,                    // ← source chain
      gasPreset: "medium",
      accountIndex: 0
    })
    ```

    Returns:

    ```json
    {
      "transactionHash": "0x...",
      "status": "success"
    }
    ```

3.  Wait for approval confirmation (check transaction status)

**B. Get Swap Transaction Data**

**PARAMETER RULES:**

- `fromTokenAddress` → MUST be the EXACT value from TokenInfo.address (Step 0)
- `toTokenAddress` → MUST be the EXACT value from TokenInfo.address (Step 0)
- `fromTokenChain` → MUST be the EXACT value from TokenInfo.chain (Step 0)
- `toTokenChain` → MUST be the EXACT value from TokenInfo.chain (Step 0)
- `fromTokenAmount` → MUST be the EXACT value used in quote (Step 1)
- `amountOutMin` → MUST be from quote response (Step 1)
- `fromAddress` / `toAddress` → MUST be wallet address from eth_get_address (Step 0)

```
bridgers_get_swap_data({
  fromTokenAddress: "0x...",        // ← from TokenInfo.address
  toTokenAddress: "0x...",          // ← from TokenInfo.address
  fromAddress: userWalletAddress,   // ← from eth_get_address
  toAddress: userWalletAddress,     // ← from eth_get_address
  fromTokenChain: "BSC",            // ← from TokenInfo.chain (EXACT)
  toTokenChain: "ETH",              // ← from TokenInfo.chain (EXACT)
  fromTokenAmount: "100000000000000000000",  // ← SAME as quote
  amountOutMin: quote.minOutput,    // ← from quote response
  fromCoinCode: "USDT(BSC)",        // ← format: symbol(chain)
  toCoinCode: "USDT(ETH)"           // ← format: symbol(chain)
})
```

Returns transaction data:

```json
{
  "to": "0xb685760ebd368a891f27ae547391f4e2a289895b",
  "data": "0x...", // calldata
  "value": "0x0" // ETH value
}
```

2. **Sign and Broadcast Transaction**

   ```
   eth_send_transaction({
     to: swapData.to,
     data: swapData.data,
     value: swapData.value,
     chainId: 56,  // BSC
     gasPreset: "medium",
     accountIndex: 0
   })
   ```

   Returns:

   ```json
   {
     "transactionHash": "0x...",
     "status": "success",
     "blockNumber": 12345
   }
   ```

3. **Create Order Record**

   ```
   bridgers_create_order({
     hash: transactionHash,
     // ... same parameters as bridgers_get_swap_data
   })
   ```

   Returns:

   ```json
   {
     "orderId": "...",
     "message": "Order created successfully"
   }
   ```

4. **Track Order Status**
   ```
   bridgers_query_orders({
     fromAddress: userWalletAddress
   })
   ```

**IMPORTANT NOTES:**

- ⚠️ **Token Approval**: If swapping ERC20 tokens (not native ETH/BNB), the token MUST be approved first
- ⚠️ **Gas Fee**: Ensure wallet has enough native currency for gas (BNB on BSC, ETH on Ethereum, etc.)
- ⚠️ **Transaction Type**: Use `eth_send_transaction` for contract calls, not `eth_transfer`

## 🛑 Error Handling

**IF quote fails:**

- Check if token is supported on both chains
- Verify amount is within min/max range
- Check if chains are supported

**IF approval fails:**

- Verify wallet has sufficient tokens
- Check if contract address is correct
- Ensure user approves the transaction

**IF swap execution fails:**

- Verify wallet has sufficient gas
- Check if approval was successful
- Validate all parameters

## 📊 Supported Operations

### 1. Get Token List

```
bridgers_get_tokens()
```

Returns list of all supported tokens across all chains.

### 2. Request Quote

```
bridgers_get_quote({
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  fromTokenAmount: "1000000000000000000", // with decimals
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  userAddress: "0x..."
})
```

### 3. Check Approval Status

```
bridgers_check_approval({
  tokenAddress: "0x...",
  spenderAddress: "0x...", // Bridgers contract
  ownerAddress: "0x...",
  chain: "BSC"
})
```

### 4. Approve Token

```
bridgers_approve_token({
  tokenAddress: "0x...",
  spenderAddress: "0x...", // Bridgers contract
  chain: "BSC"
})
```

### 5. Execute Swap (Get Transaction Data)

```
bridgers_execute_swap({
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  fromAddress: "0x...",
  toAddress: "0x...",
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  fromTokenAmount: "1000000000000000000",
  amountOutMin: "990000000000000000",
  fromCoinCode: "USDT(BSC)",
  toCoinCode: "USDT(ETH)"
})
```

Returns transaction data (to, data, value) for user to sign and broadcast.

### 6. Create Order

```
bridgers_create_order({
  hash: "0x...", // transaction hash after broadcast
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  fromAddress: "0x...",
  toAddress: "0x...",
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  fromTokenAmount: "1000000000000000000",
  amountOutMin: "990000000000000000",
  fromCoinCode: "USDT(BSC)",
  toCoinCode: "USDT(ETH)"
})
```

Returns orderId for tracking.

### 7. Query Order Status

```
bridgers_query_order({
  orderId: "..." // or use fromAddress to get all orders
})
```

## 📝 Examples

### Complete End-to-End Example: Swap 100 USDT from BSC to ETH

```
User: "用我的钱包兑换 100 USDT 从 BSC 到 ETH"

Step 1: Get wallet address
eth_get_address({ accountIndex: 0 })
→ Returns: "0x1234...5678"

Step 2: Get token information
bridgers_get_tokens()
→ Find USDT on BSC: address "0x55d398326f99059ff775485246999027b3197955", decimals: 18
→ Find USDT on ETH: address "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6

Step 3: Get quote
bridgers_get_quote({
  fromTokenAddress: "0x55d398326f99059ff775485246999027b3197955",
  toTokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  fromTokenAmount: "100000000000000000000",  // 100 USDT with 18 decimals
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  userAddress: "0x1234...5678"
})
→ Returns:
  {
    "expectedOutput": "99.8",
    "minOutput": "99500000",  // with 6 decimals
    "platformFee": "0.20%",
    "chainFee": "0.002 BNB",
    "contractAddress": "0xb685760ebd368a891f27ae547391f4e2a289895b"
  }

Step 4: Present quote and wait for confirmation
Agent: 🔄 兑换报价：
       • 支付：100 USDT (BSC)
       • 获得：~99.8 USDT (ETH)
       • 最小获得：99.5 USDT (含滑点保护)
       • 平台费率：0.20%
       • 链上手续费：0.002 BNB
       确认执行兑换？(输入"是"或"确认")

User: "是"

Step 5: Get swap transaction data
bridgers_get_swap_data({
  fromTokenAddress: "0x55d398326f99059ff775485246999027b3197955",
  toTokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  fromAddress: "0x1234...5678",
  toAddress: "0x1234...5678",
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  fromTokenAmount: "100000000000000000000",
  amountOutMin: "99500000",
  fromCoinCode: "USDT(BSC)",
  toCoinCode: "USDT(ETH)"
})
→ Returns:
  {
    "to": "0xb685760ebd368a891f27ae547391f4e2a289895b",
    "data": "0x7ff36ab50000...",  // calldata
    "value": "0x0"
  }

Step 6: Execute transaction (sign and broadcast)
eth_send_transaction({
  to: "0xb685760ebd368a891f27ae547391f4e2a289895b",
  data: "0x7ff36ab50000...",
  value: "0x0",
  chainId: 56,  // BSC
  gasPreset: "medium",
  accountIndex: 0
})
→ Returns:
  {
    "transactionHash": "0xabcd...ef01",
    "status": "success",
    "blockNumber": 34567890
  }

Step 7: Create order record
bridgers_create_order({
  hash: "0xabcd...ef01",
  fromTokenAddress: "0x55d398326f99059ff775485246999027b3197955",
  toTokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  fromAddress: "0x1234...5678",
  toAddress: "0x1234...5678",
  fromTokenChain: "BSC",
  toTokenChain: "ETH",
  fromTokenAmount: "100000000000000000000",
  amountOutMin: "99500000",
  fromCoinCode: "USDT(BSC)",
  toCoinCode: "USDT(ETH)"
})
→ Returns:
  {
    "orderId": "abc123...",
    "message": "Order created successfully"
  }

Step 8: Track order
Agent: ✅ 兑换交易已提交！
       订单号：abc123...
       交易哈希：0xabcd...ef01

       您可以随时查询订单状态。

Later, user asks: "查询订单状态"

bridgers_query_orders({
  fromAddress: "0x1234...5678"
})
→ Returns order with status: "✅ 发币完成"
```

### Example 1: Swap USDT from Polygon to BSC

```
User: "帮我把 Polygon 上的 USDT 兑换到 BSC 上，兑换 10 USDT"

Agent Steps:

Step 0: Prepare (获取必要信息)

  a) Get wallet address first:
     eth_get_address({ accountIndex: 0 })
     → Returns: { address: "0x1234...5678" }

  b) Get token list and extract EXACT values:
     bridgers_get_tokens()

     → Find USDT on Polygon by searching: symbol=="USDT" AND chain=="POLYGON"
     Result:
     {
       "chain": "POLYGON",  // ← STORE THIS EXACT STRING
       "symbol": "USDT",
       "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",  // ← STORE THIS
       "decimals": 6  // ← STORE THIS FOR AMOUNT CALCULATION
     }

     → Find USDT on BSC by searching: symbol=="USDT" AND chain=="BSC"
     Result:
     {
       "chain": "BSC",  // ← STORE THIS EXACT STRING
       "symbol": "USDT",
       "address": "0x55d398326f99059ff775485246999027b3197955",  // ← STORE THIS
       "decimals": 18  // ← STORE THIS FOR VALIDATION
     }

     → Calculate amount: 10 USDT × 10^6 = "10000000" (use Polygon decimals)

Step 1: Get quote (⚠️ USE EXACT VALUES FROM STEP 0)

  bridgers_get_quote({
    fromTokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",  // ← EXACT from Step 0b
    toTokenAddress: "0x55d398326f99059ff775485246999027b3197955",    // ← EXACT from Step 0b
    fromTokenAmount: "10000000",  // ← calculated in Step 0b
    fromTokenChain: "POLYGON",    // ← EXACT string from Step 0b TokenInfo.chain
    toTokenChain: "BSC",          // ← EXACT string from Step 0b TokenInfo.chain
    userAddress: "0x1234...5678"  // ← from Step 0a
  })
  → Returns quote with minOutput, fees, etc.

Step 2: Present quote to user

  Agent: "🔄 Bridgers 兑换报价：
         • 支付：10 USDT (Polygon)
         • 获得：~9.98 USDT (BSC)
         • 最小获得：9.95 USDT (含滑点保护)
         • 平台费率：0.2%
         • 链上手续费：~0.5 MATIC

         ⚠️ 跨链兑换不可逆，请仔细核对。
         继续执行兑换？(输入"是"或"确认"继续)"

Step 3: Wait for confirmation

  User: "确认"

Step 4: Get swap transaction data (⚠️ REUSE EXACT VALUES FROM STEP 0 & 1)

  bridgers_get_swap_data({
    fromTokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",  // ← SAME as Step 1
    toTokenAddress: "0x55d398326f99059ff775485246999027b3197955",    // ← SAME as Step 1
    fromAddress: "0x1234...5678",      // ← SAME as Step 0a
    toAddress: "0x1234...5678",        // ← SAME as Step 0a
    fromTokenChain: "POLYGON",         // ← EXACT SAME as Step 1
    toTokenChain: "BSC",               // ← EXACT SAME as Step 1
    fromTokenAmount: "10000000",       // ← EXACT SAME as Step 1
    amountOutMin: quote.minOutput,     // ← from Step 1 response
    fromCoinCode: "USDT(POLYGON)",     // ← format: symbol(chain)
    toCoinCode: "USDT(BSC)"            // ← format: symbol(chain)
  })
  → Returns: { to: "0x...", data: "0x...", value: "0x0" }

Step 5-7: Execute transaction, create order, track status
  (Follow standard execution flow)
```

### Example 2: Swap USDT from BSC to ETH

```
User: "我想用BSC链上的100 USDT兑换成ETH链上的USDT"

Agent Steps:

Step 0: Prepare

  a) eth_get_address({ accountIndex: 0 })
     → "0x1234...5678"

  b) bridgers_get_tokens()
     → Find USDT BSC: "0x55d398326f99059ff775485246999027b3197955" (18 decimals)
     → Find USDT ETH: "0xdac17f958d2ee523a2206206994597c13d831ec7" (6 decimals)
     → 100 USDT with 18 decimals: "100000000000000000000"

Step 1-7: (Continue with quote, confirmation, and execution)
1. Call bridgers_get_quote with:
   - fromTokenAddress: "0x55d398326f99059ff775485246999027b3197955" (USDT BSC)
   - toTokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7" (USDT ETH)
   - fromTokenAmount: "100000000000000000000" (100 USDT with 18 decimals)
   - fromTokenChain: "BSC"
   - toTokenChain: "ETH"
   - userAddress: "0x..."
3. Present quote to user and wait for confirmation
4. Check approval status
5. If needed, approve token
6. Execute swap and get transaction data
7. User signs and broadcasts transaction
8. Create order with transaction hash
9. Provide order tracking information
```

### Example 2: Check Order Status

```
User: "查询我的兑换订单状态"

Agent Steps:
1. Call bridgers_query_order with user's wallet address
2. Display order status with human-readable descriptions:
   - receive_complete: "✅ 发币完成"
   - wait_receive_send: "⏳ 兑换完成，等待发币"
   - wait_exchange_push: "🔄 正在兑换中..."
   - refund_complete: "↩️ 退币完成"
3. Show transaction hashes and block explorer links
```

## ⚠️ Important Notes

### Chain IDs and Names

Popular chains supported:

- **ETH**: Ethereum Mainnet
- **BSC**: BNB Smart Chain
- **POLYGON**: Polygon (Matic)
- **ARBITRUM**: Arbitrum One
- **OPTIMISM**: Optimism
- **AVALANCHE**: Avalanche C-Chain
- **FANTOM**: Fantom Opera
- **CRONOS**: Cronos
- **HECO**: Huobi ECO Chain
- **OKC**: OKX Chain
- **TRON**: Tron Network
- **SOLANA**: Solana
- **BASE**: Base
- **LINEA**: Linea
- **SCROLL**: Scroll
- **ZKSYNC**: zkSync Era
- **MANTLE**: Mantle
- **TON**: The Open Network
- **XRP**: Ripple

### Native Token Address

For native tokens (ETH, BNB, MATIC, etc.), use:

```
0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
```

### Contract Addresses by Chain

Major Bridgers contract addresses:

- ETH: `0xb685760ebd368a891f27ae547391f4e2a289895b`
- BSC: `0xb685760ebd368a891f27ae547391f4e2a289895b`
- POLYGON: `0xb685760ebd368a891f27ae547391f4e2a289895b`
- HECO: `0xaeAE2CBb1E024E27e80cc61eE9A8B300282209B4`
- ARBITRUM: `0xb685760ebd368a891f27ae547391f4e2a289895b`
- OPTIMISM: `0xb685760ebd368a891f27ae547391f4e2a289895b`
- BASE: `0xa18968cc31232724f1dbd0d1e8d0b323d89f3501`
- TRON: `TPwezUWpEGmFBENNWJHwXHRG1D2NCEEt5s`
- SOLANA: `FDF8AxHB8UK7RS6xay6aBvwS3h7kez9gozqz14JyfKsg`

### Token Decimals

Common token decimals:

- **USDT (ETH)**: 6 decimals
- **USDT (BSC)**: 18 decimals
- **USDT (POLYGON)**: 6 decimals
- **USDC**: typically 6 decimals
- **DAI**: 18 decimals
- **ETH/BNB/MATIC**: 18 decimals

**ALWAYS** verify decimals from token list API before calculations.

### Order Status Mapping

Status codes and their meanings:

- `wait_deposit_send`: "等待存币"
- `wait_deposit_send_fail`: "存币失败"
- `wait_exchange_push`: "正在兑换中..."
- `wait_exchange_return`: "正在兑换中..."
- `wait_receive_send`: "兑换完成，等待发币"
- `wait_enough_send`: "正在发币中..."
- `wait_receive_confirm`: "发币确认中..."
- `receive_complete`: "✅ 发币完成"
- `wait_refund_send`: "等待退币"
- `wait_refund_confirm`: "退币确认中..."
- `refund_complete`: "退币完成"
- `timeout`: "兑换超时"
- `ERROR`: "正在兑换中..."
- `wait_for_information`: "请联系客服"

### Refund Reasons

When refund occurs, reasons include:

1. 流动性不足
2. 误差超过阈值
3. 原币维护
4. 黑名单
5. 目标币维护
6. 兑换数量不在范围内
7. 存币超时
8. 与风险地址交互

## 🔧 API Endpoints

Base URL: `https://api.bridgers.xyz`

All requests use **POST** method with `application/json` content type.

### Key Endpoints:

1. **Get Token List**: `/api/exchangeRecord/getToken`
2. **Request Quote**: `/api/sswap/quote`
3. **Get Swap Data**: `/api/sswap/swap`
4. **Create Order**: `/api/exchangeRecord/updateDataAndStatus`
5. **Query Orders**: `/api/exchangeRecord/getTransData`

## 🎯 Best Practices

1. **Always check token list first** to get accurate contract addresses and decimals
2. **Validate amounts** against depositMin and depositMax from quote
3. **Calculate slippage** appropriately (typically 0.5-1%)
4. **Monitor order status** after swap execution
5. **Handle refunds gracefully** and explain reasons to users
6. **Keep transaction hashes** for dispute resolution
7. **Test with small amounts** first for new token pairs

## ❌ Common Mistakes to Avoid

1. ❌ Using wrong decimals for token amounts
2. ❌ Forgetting to check approval before swap
3. ❌ Not validating amount is within min/max range
4. ❌ Mixing up fromChain and toChain
5. ❌ Not handling native token address (0xeeee...)
6. ❌ Skipping user confirmation for swaps
7. ❌ Not providing order tracking after swap

## 🔗 Integration with Wallet Custody

This skill integrates with the `wallet_custody_manager` skill:

1. Use wallet custody to **sign transactions** generated by Bridgers
2. Use wallet custody to **broadcast signed transactions**
3. Coordinate gas estimation between both skills
4. Share wallet address context

**Example Integration:**

```
1. User: "用我的钱包兑换100 USDT从BSC到ETH"
2. Get wallet address from wallet_custody_manager
3. Get quote from Bridgers
4. Present confirmation
5. Check/execute approval via wallet_custody_manager
6. Get swap transaction data from Bridgers
7. Sign and broadcast via wallet_custody_manager
8. Track order via Bridgers
```

## 📞 Support

If issues occur:

1. Check order status via `bridgers_query_order`
2. Verify transaction on block explorer
3. If status is `wait_for_information`, user should contact Bridgers support
4. Save orderId for tracking and support inquiries

---

**Remember**: Cross-chain swaps are irreversible. Always verify all details before execution.

```

```
