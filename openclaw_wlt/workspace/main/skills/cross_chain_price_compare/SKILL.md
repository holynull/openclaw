---
name: cross_chain_price_compare
description: Compare cross-chain swap quotes from all available platforms (Bridgers DEX, Omnibridge) to find the best exchange rate and lowest fees
metadata: { "openclaw": { "emoji": "⚖️", "requires": { "env": [] } } }
---

# Cross-Chain Price Comparison

Compare cross-chain token swap quotes from multiple platforms to help users find the most cost-effective exchange option.

## ⚡ Core Rule: Always Query Fresh

**CRITICAL: Each request = new API calls. Never cache!**

- Query fresh on every request
- Refresh before execution
- Alert on >1% rate change
- Quotes >30s = stale

Platforms:

- **Bridgers DEX**: Smart contract-based
- **Omnibridge**: Platform-custodied

## 🎯 Two Modes

**Mode 1:** Specific pair → "对比 100 USDT 从 BSC 到 ETH"  
**Mode 2:** General query → "查一下支持的兑换"

Detection:

```javascript
const hasAmount = /\d+\s*(USDT|USDC|ETH)/.test(query);
const hasRoute = /(从|to|→).*(BSC|ETH|Polygon)/.test(query);
return hasAmount && hasRoute ? "mode1" : "mode2";
```

## 📋 Mode 1: Single Pair Workflow

**1. Prepare params**

Bridgers: addresses + WITH decimals

```javascript
const tokens = await bridgers_get_tokens();
const from = tokens.find((t) => t.symbol === "USDT" && t.chain === "BSC");
const amount = (100 * Math.pow(10, from.decimals)).toString();
```

Omnibridge: codes + NO decimals

```javascript
const depositCoinCode = "USDT(BSC)"; // TOKEN(CHAIN)
const depositCoinAmt = "100"; // NO decimals
```

**2. Query both**

```javascript
const addr = await eth_get_address({ accountIndex: 0 });

const bQuote = await bridgers_get_quote({
  fromTokenAddress,
  toTokenAddress,
  fromTokenAmount: amount,
  fromTokenChain,
  toTokenChain,
  userAddress: addr.address,
});

const oQuote = await omnibridge_get_quote({
  depositCoinCode,
  receiveCoinCode,
  depositCoinAmt,
});
```

**3. Normalize & display**

```javascript
const bOut = parseFloat(bQuote.expectedOutput) / Math.pow(10, decimals);
const oOut = parseFloat(oQuote.receiveCoinAmt);
```

```
📊 报价对比
⏰ 2026-04-01 12:30:45

100 USDT (BSC) → (ETH)

Platform   │ 到账  │ 费率  │ 限额
───────────┼───────┼───────┼─────
✅ Bridgers│ 99.5  │ 0.30% │ 10
Omnibridge │ 99.2  │ 0.50% │ 10

💰 Bridgers (+0.3)
⚠️ 执行前重查
```

**4. Refresh before swap**

```javascript
const fresh = await queryBoth(params);
if (Math.abs(fresh.best - old.best) / old.best > 0.01) {
  alert("⚠️ 价格变化超过1%");
}
```

## 📋 Mode 2: Supported Pairs Workflow

**1. Get support lists**

```javascript
const bTokens = await bridgers_get_tokens();

const chains = ["BSC", "ETH", "Polygon", "Arbitrum"];
const oCoins = {};
for (const chain of chains) {
  oCoins[chain] = await omnibridge_get_coins({ mainNetwork: chain });
}
```

**2. Build pairs & query (100 tokens each)**

```javascript
const popular = ["USDT", "USDC", "ETH", "WETH"];
const quotes = [];

for (const token of popular) {
  // Find cross-chain pairs
  // Query both platforms
  // Store results
}
```

**3. Display**

```
📊 支持的兑换行情
⏰ 2026-04-01 12:30:45

对              │ Bridgers│ 费率 │ Omnibridge│ 费率
────────────────┼─────────┼──────┼───────────┼─────
USDT: BSC→ETH   │ 99.5    │ 0.3% │ 99.2      │ 0.5%
USDT: BSC→Poly  │ 99.6    │ 0.25%│ ❌        │ -
```

## 🚨 Error Handling

**Platform error**: Show results from available platforms
**No support**: Suggest alternatives (WBTC, etc.)
**Out of limits**: Alert user with min/max
**API timeout**: Retry once, then show partial results

## 🎯 Best Practices

**1. Query fresh quotes every request** (no caching)
**2. Refresh before execution** (check rate change >1%)  
**3. Handle decimals correctly** (Bridgers WITH / Omnibridge WITHOUT)
**4. Consider all factors** (fees, security, speed, limits)
**5. Alert on significant changes** (>30s = stale)

## 🔧 Execution Checklist

Before showing comparison:

- ✅ Fresh quotes (<30s old)
- ✅ Timestamp shown
- ✅ All amounts normalized (no decimals)
- ✅ Total fees calculated
- ✅ Sorted by best output
- ✅ Amount within limits
- ✅ Best option marked

Before swap:

- ✅ REFRESH quotes
- ✅ Check rate change >1%
- ✅ Alert user if changed
- ✅ Get confirmation with updated rates

## 📚 Related Skills

- **bridgers_exchange**: Execute Bridgers swaps
- **omnibridge_swap**: Execute Omnibridge swaps
- **wallet_custody_manager**: Wallet addresses

## ⚠️ Important Warnings

1. **Quotes are time-sensitive**: Exchange rates change constantly
2. **Gas fees vary**: Network congestion affects costs
3. **Slippage can occur**: Final amount may differ slightly
4. **Platform availability**: Some platforms may be temporarily unavailable
5. **Supported pairs differ**: Not all platforms support all token pairs

## 🎯 Success Criteria

A successful comparison should:

1. ✅ Show quotes from all available platforms
2. ✅ Clearly identify the best option
3. ✅ Explain the differences between platforms
4. ✅ Help user make an informed decision
5. ✅ Handle errors gracefully
6. ✅ Validate amounts are within limits
7. ✅ Present data in an easy-to-understand format

---

**Remember**: This skill is about comparison and decision-making. After user decides, use the appropriate platform skill (bridgers_exchange or omnibridge_swap) to execute the actual swap.
