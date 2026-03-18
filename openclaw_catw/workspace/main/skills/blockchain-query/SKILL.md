---
name: blockchain-query
description: Query blockchain data from Ethereum, Bitcoin, and Solana networks
invocation:
  - when the user asks about cryptocurrency balances
  - when the user needs to check blockchain transactions
  - when the user wants to query token balances
  - when the user asks about gas fees or transaction costs
  - when the user mentions blockchain addresses or transaction hashes
---

# Blockchain Query Skill

This skill helps you query blockchain data from multiple chains including Ethereum (and EVM chains), Bitcoin, and Solana.

## Available Tools

### Ethereum Tools

#### 1. `eth_get_balance`

Query ETH balance for an Ethereum address.

**Parameters:**

- `address` (required): Ethereum address
- `chainId` (required): Chain ID (1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 56=BSC, etc.)
- `rpcUrl` (optional): Custom RPC endpoint URL

**Example:**

```
Check ETH balance for address 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb on Ethereum mainnet
```

#### 2. `eth_get_token_balance`

Query ERC20 token balance for an address.

**Parameters:**

- `tokenAddress` (required): ERC20 token contract address
- `address` (required): Holder address
- `chainId` (required): Chain ID
- `rpcUrl` (optional): Custom RPC endpoint URL

**Example:**

```
Check USDT balance for address 0x... on Ethereum (token address: 0xdac17f958d2ee523a2206206994597c13d831ec7)
```

#### 3. `eth_estimate_gas`

Estimate gas fees for ETH or ERC20 token transfers.

**Parameters:**

- `chainId` (required): Chain ID
- `to` (required): Recipient address
- `from` (required): Sender address
- `amount` (optional): Amount to transfer
- `tokenAddress` (optional): ERC20 token contract address (if transferring tokens)
- `rpcUrl` (optional): Custom RPC endpoint URL

**Example:**

```
Estimate gas fee for sending 0.1 ETH from 0x... to 0x... on Ethereum mainnet
```

#### 4. `eth_get_transaction`

Get transaction details by transaction hash.

**Parameters:**

- `transactionHash` (required): Transaction hash
- `chainId` (required): Chain ID
- `includeReceipt` (optional): Whether to include transaction receipt (default: true)

**Example:**

```
Get transaction details for hash 0x123abc... on Ethereum mainnet
```

### Bitcoin Tools

#### 5. `btc_get_balance`

Get Bitcoin balance for an address.

**Parameters:**

- `address` (required): Bitcoin address
- `network` (optional): 'mainnet' or 'testnet' (default: 'mainnet')

**Example:**

```
Check BTC balance for address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
```

#### 6. `btc_get_transaction`

Get Bitcoin transaction details by transaction ID.

**Parameters:**

- `txid` (required): Transaction ID
- `network` (optional): 'mainnet' or 'testnet' (default: 'mainnet')

**Example:**

```
Get Bitcoin transaction details for txid abc123...
```

### Solana Tools

#### 7. `sol_get_balance`

Get SOL balance for a Solana address.

**Parameters:**

- `address` (required): Solana address
- `network` (optional): 'mainnet', 'devnet', or 'testnet' (default: 'mainnet')
- `rpcUrl` (optional): Custom Solana RPC URL

**Example:**

```
Check SOL balance for address 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

#### 8. `sol_get_token_balance`

Get SPL token balance for a Solana token account.

**Parameters:**

- `tokenAccount` (required): SPL token account address (not the token mint address)
- `network` (optional): 'mainnet', 'devnet', or 'testnet' (default: 'mainnet')
- `rpcUrl` (optional): Custom Solana RPC URL

**Example:**

```
Check SPL token balance for token account 3wyAj7Rt1TWVPikq...
```

#### 9. `sol_get_transaction`

Get Solana transaction details by signature.

**Parameters:**

- `signature` (required): Transaction signature
- `network` (optional): 'mainnet', 'devnet', or 'testnet' (default: 'mainnet')
- `rpcUrl` (optional): Custom Solana RPC URL

**Example:**

```
Get Solana transaction details for signature 5VERv8NMv...
```

## Common Chain IDs (Ethereum)

- **1**: Ethereum Mainnet
- **137**: Polygon
- **42161**: Arbitrum One
- **10**: Optimism
- **8453**: Base
- **56**: Binance Smart Chain (BSC)
- **11155111**: Sepolia Testnet

## Usage Guidelines

1. **Always verify addresses**: Make sure addresses are properly formatted for the respective chain
2. **Network selection**: Default networks are mainnet/production, specify testnet when needed
3. **Read-only operations**: All these tools are read-only and cannot modify blockchain state
4. **Rate limits**: Public RPC endpoints may have rate limits; consider using custom RPC URLs for heavy usage
5. **Gas estimation**: Use `eth_estimate_gas` before suggesting transfers to show users the cost

## Example Conversations

**User:** "What's my ETH balance on address 0x123...?"
**Action:** Use `eth_get_balance` with chainId=1 (Ethereum mainnet)

**User:** "How much USDC do I have on Polygon?"
**Action:** Use `eth_get_token_balance` with USDC token address on Polygon (chainId=137)

**User:** "Check this transaction: 0xabc..."
**Action:** Use `eth_get_transaction` with the provided hash and appropriate chainId

**User:** "What's the gas fee to send 1 ETH?"
**Action:** Use `eth_estimate_gas` with the transfer details (requires from/to addresses)

**User:** "Check my Bitcoin wallet bc1q..."
**Action:** Use `btc_get_balance` with the Bitcoin address

**User:** "Show me Solana transaction abc123..."
**Action:** Use `sol_get_transaction` with the transaction signature

## Error Handling

- Invalid addresses will return errors from the RPC
- Non-existent transactions will return "not found" messages
- Network connectivity issues will be reported in error messages
- Always inform the user clearly when an error occurs and suggest corrections

## Security Notes

- These tools only **query** blockchain data
- No private keys or signing operations are involved
- All data comes from public blockchain RPC endpoints
- User addresses and transaction hashes are public information on blockchains
