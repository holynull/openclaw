---
name: wallet-custody-sessions-spawn
description: "Delegate wallet operations to wallet-custody agent using sessions_spawn. Use for: balance queries, transfers, address generation, signing. MUST delegate ALL wallet questions."
emoji: "🔄"
priority: "high"
version: "3.0.0"
requires:
  tools:
    - sessions_spawn
keywords:
  - wallet
  - balance
  - transfer
  - address
  - USDT
  - Polygon
  - Ethereum
---

# Wallet Custody Delegation Skill

## Your Role

You are the **Main Agent** with NO direct wallet access. User entrusted their HD wallet to the **Wallet Custody Agent** (`wallet-custody`).

**⚠️ CRITICAL: NEVER say "I cannot check" - You HAVE capability via sessions_spawn!**

## When to Delegate

**MUST use sessions_spawn for ALL wallet questions:**

### Trigger Phrases
- Chinese: "多少", "余额", "查询", "地址", "转账"
- English: "balance", "how much", "address", "transfer", "send"
- Any token: USDT, USDC, ETH, MATIC, DAI, etc.
- Any chain: Polygon, Ethereum, Arbitrum, Base, etc.

### Common Scenarios
- Balance: "多少USDT" "What's my ETH balance"
- Address: "我的地址" "wallet address"
- Transfer: "转账" "Send 100 USDT to..."
- Signing: "Sign message"

**Rule: If mentions tokens/chains/wallet → IMMEDIATELY call sessions_spawn**

## Supported Networks

**EVM Chains:**
- Ethereum (1), Polygon (137), Arbitrum (42161)
- Optimism (10), Base (8453), Avalanche (43114)
- Sepolia (11155111), Polygon Amoy (80002)

**Other:**
- Bitcoin (Legacy/SegWit/Native SegWit)
- Solana

## How to Use sessions_spawn

### Basic Pattern

```typescript
sessions_spawn({
  agentId: "wallet-custody",
  message: "Clear instruction with chainId, tool name, parameters",
  mode: "run",
  runtime: "subagent",
  sandbox: "inherit"
})
```

### Parameters
- **agentId**: Always `"wallet-custody"`
- **message**: Natural language with specifics (chainId, tool, params)
- **mode**: `"run"` for one-shot (recommended)
- **runtime**: `"subagent"` (standard)
- **sandbox**: `"inherit"` (recommended)

## Example Flows

### Balance Query - Polygon MATIC
```
User: "我的 Polygon 上有多少 MATIC？"

sessions_spawn({
  agentId: "wallet-custody",
  message: "Check native MATIC balance on Polygon (chainId 137) using eth_get_balance",
  mode: "run",
  runtime: "subagent",
  sandbox: "inherit"
})
```

### Balance Query - Ethereum USDC
```
User: "How much USDC on Ethereum?"

sessions_spawn({
  agentId: "wallet-custody",
  message: "Check USDC balance on Ethereum (chainId 1) using eth_get_token_balance with token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  mode: "run",
  runtime: "subagent",
  sandbox: "inherit"
})
```

### Common Token Addresses
- Ethereum USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Ethereum USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- Polygon USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- Polygon USDT: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

### Address Query
```
User: "What's my Ethereum address?"

sessions_spawn({
  agentId: "wallet-custody",
  message: "Generate Ethereum address for account 0 using eth_get_address",
  mode: "run",
  runtime: "subagent",
  sandbox: "inherit"
})
```

### Transfer
```
User: "Send 0.1 ETH to 0xABC... on Arbitrum"

sessions_spawn({
  agentId: "wallet-custody",
  message: "Transfer 0.1 ETH to 0xABC... on Arbitrum (chainId 42161) using eth_transfer",
  mode: "run",
  runtime: "subagent",
  sandbox: "inherit"
})
```

### Sign Message
```
User: "Sign 'Hello' for DApp"

sessions_spawn({
  agentId: "wallet-custody",
  message: "Sign message 'Hello' using eth_sign_message for account 0",
  mode: "run",
  runtime: "subagent",
  sandbox: "inherit"
})
```

### Bitcoin Address
```
User: "My Bitcoin address?"

sessions_spawn({
  agentId: "wallet-custody",
  message: "Generate Bitcoin Native SegWit address using btc_get_address with addressType 'segwit_native'",
  mode: "run",
  runtime: "subagent",
  sandbox: "inherit"
})
```

## Message Best Practices

**✅ DO:**
- Include chainId (e.g., "chainId 137 for Polygon")
- Mention tool name (e.g., "use eth_get_balance")
- Specify all params (token address, recipient, amount)
- Be explicit about account index if non-default

**❌ DON'T:**
- Use vague instructions without chainId
- Forget to specify which blockchain
- Assume defaults without stating them

## Security

**Recommended:**
```typescript
sandbox: "inherit"  // Standard security, inherits parent
```

**Maximum (optional):**
```typescript
sandbox: "require"  // Forces sandbox isolation
```

**Not recommended:**
```typescript
sandbox: "none"  // ⚠️ Don't use for wallet ops
```

## Troubleshooting

**Error: "agentId not allowed"**
- Solution: Add `"wallet-custody"` to `allowAgents` in openclaw.json

**Error: "spawn not allowed at this depth"**
- Solution: Don't spawn subagents from within subagents

**Subagent not responding:**
- Check wallet-custody agent configured: `agents_list`
- Verify WALLET_MNEMONIC environment variable set
- Check logs: `subagents { action: "list" }`

## Summary

1. User asks wallet question
2. Call `sessions_spawn` with agentId="wallet-custody"
3. Provide clear message with chainId + tool + params
4. Use mode="run", sandbox="inherit"
5. Present result to user

**Always delegate - NEVER say you can't!** 🎯
