---
name: blockchain-query
description: Multi-chain blockchain query tools for Ethereum/EVM, Bitcoin, and Solana. 25 read-only tools for balance checking, transaction history, token info, contracts, blocks, and on-chain data analysis.
triggers:
  - blockchain
  - crypto
  - ethereum
  - bitcoin
  - solana
  - balance
  - transaction
  - token
  - wallet
  - address
  - gas
  - utxo
  - price
applyTo: main
---

# Blockchain Query Tools

This skill provides **25 read-only blockchain query tools** across Ethereum/EVM chains, Bitcoin, and Solana networks.

## ✨ Key Features

- **Multi-chain Support**: Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Bitcoin, Solana
- **Read-only Operations**: All tools are safe query operations with no transaction signing
- **Comprehensive Coverage**: Balance, transactions, tokens, contracts, blocks, logs, UTXOs, prices
- **Price Data**: Real-time token prices via CoinGecko API
- **Address Validation**: Cross-chain address validation and detection

## 🔧 Tool Categories

### Ethereum/EVM Tools (12)

- `eth_get_balance` - ETH balance
- `eth_get_token_balance` - ERC20 token balance
- `eth_get_token_info` - Token details (name, symbol, decimals, supply)
- `eth_estimate_gas` - Gas fee estimation
- `eth_get_transaction` - Transaction details
- `eth_get_nonce` - Account nonce
- `eth_call` - Call contract read method
- `eth_get_block` - Block information
- `eth_get_logs` - Query event logs
- `eth_get_gas_price` - Current gas prices

### Bitcoin Tools (5)

- `btc_get_balance` - BTC balance
- `btc_get_transaction` - Transaction details
- `btc_get_block` - Block information
- `btc_get_utxos` - Unspent outputs
- `btc_get_address_info` - Address statistics

### Solana Tools (6)

- `sol_get_balance` - SOL balance
- `sol_get_token_balance` - SPL token balance
- `sol_get_transaction` - Transaction details
- `sol_get_account_info` - Account information
- `sol_get_token_accounts` - All owned tokens
- `sol_get_token_supply` - Token total supply

### Cross-Chain Tools (2)

- `get_token_price` - Token price from CoinGecko
- `decode_address` - Validate and identify address type

## 📋 Common Chain IDs

| Chain            | Chain ID |
| ---------------- | -------- |
| Ethereum Mainnet | 1        |
| Polygon          | 137      |
| Arbitrum One     | 42161    |
| Optimism         | 10       |
| Base             | 8453     |
| BSC              | 56       |
| Sepolia Testnet  | 11155111 |

## 💡 Usage Examples

### Check Ethereum Balance

```
Get ETH balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb on Ethereum mainnet
```

### Check Token Balance

```
Check USDT balance for 0x... on Ethereum (token: 0xdac17f958d2ee523a2206206994597c13d831ec7)
```

### Get Token Price

```
Get current price of Bitcoin (use tokenId: 'bitcoin')
```

### Estimate Gas Fee

```
Estimate gas for sending 0.1 ETH from 0x... to 0x... on Arbitrum
```

### Query Transaction

```
Get transaction details for hash 0x123abc... on Polygon
```

### Get Bitcoin UTXOs

```
Get unspent outputs for Bitcoin address bc1q...
```

### Get Solana Token Accounts

```
Show all SPL tokens owned by Solana address 7xKXtg2...
```

### Validate Address

```
Check what blockchain this address belongs to: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## 🔒 Security Notes

- **Read-only**: All tools are query operations with no transaction signing
- **No private keys**: No sensitive data is required or handled
- **Public RPCs**: Uses public RPC endpoints by default (Infura with API key if available)
- **Rate limits**: Be mindful of public RPC rate limits

## 🌐 Network Support

### Ethereum/EVM Chains

- **Mainnets**: Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Linea, Avalanche
- **Testnets**: Sepolia, Polygon Amoy, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia

### Bitcoin

- **Mainnet** and **Testnet** via Blockstream API

### Solana

- **Mainnet**, **Devnet**, and **Testnet** via public RPC

## ⚙️ Configuration

### Environment Variables (Optional)

- `INFURA_KEY`: For Infura RPC access (recommended for better reliability)

### Custom RPC

Most tools support custom RPC URL parameters for private or alternative endpoints.

## 📚 Additional Resources

- **Etherscan**: https://etherscan.io
- **Blockstream**: https://blockstream.info
- **Solscan**: https://solscan.io
- **CoinGecko**: https://coingecko.com
