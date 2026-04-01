# Omnibridge Extension

Cross-chain token swap integration for OpenClaw using Omnibridge API.

## Features

- **Multi-Chain Support**: BTC, ETH, BSC, TRON, Solana, Polygon, Avalanche, and 30+ more chains
- **Get Coin List**: Query supported tokens and chains
- **Quote System**: Get exchange rates, fees, and limits before swapping
- **Order Creation**: Create cross-chain swap orders
- **Transaction Tracking**: Upload transaction hashes and track order status
- **Advanced Swaps**: Platform handles cross-chain bridging automatically

## Available Tools

### 1. `omnibridge_get_coins`

Get list of supported coins/tokens with contract addresses and decimals.

**Parameters:**

- `mainNetwork` (optional): Filter by chain (e.g., "ETH", "BSC", "POLYGON")
- `supportType` (optional): Default "advanced"

**Returns:** Array of coins with contract addresses, decimals, and chain info

### 2. `omnibridge_get_quote`

Get quote for cross-chain swap with rates and fees.

**Parameters:**

- `depositCoinCode`: Source coin (e.g., "USDT(BSC)")
- `receiveCoinCode`: Destination coin (e.g., "USDT(ETH)")
- `depositCoinAmt` (optional): Amount for accurate quote
- `fixedRate` (optional): "Y" or "N"

**Returns:** Exchange rate, fees, min/max limits

### 3. `omnibridge_create_order`

Create swap order and get platform deposit address.

**Parameters:**

- `depositCoinCode`: Source coin code
- `receiveCoinCode`: Destination coin code
- `depositCoinAmt`: Amount WITHOUT decimals
- `receiveCoinAmt`: Expected amount WITHOUT decimals
- `destinationAddr`: Receiver address
- `refundAddr`: Refund address
- `slippage` (optional): Default "0.02" (2%)
- `fixedRate` (optional): "Y" or "N"

**Returns:** Order ID and platform deposit address

### 4. `omnibridge_upload_tx`

Upload transaction hash after deposit.

**Parameters:**

- `orderId`: Order ID from create_order
- `depositTxid`: Transaction hash

**Returns:** Success confirmation

### 5. `omnibridge_query_order`

Query order status and details.

**Parameters:**

- `orderId`: Order ID

**Returns:** Complete order status with transaction hashes and amounts

## Workflow

```
1. Get supported coins
   ↓
2. Get quote (rates & fees)
   ↓
3. Create order (get platform address)
   ↓
4. Send tokens to platform address
   ↓
5. Upload transaction hash
   ↓
6. Query order status (track progress)
```

## Configuration

Add to `openclaw.json`:

```json
{
  "extensions": {
    "omnibridge": {
      "enabled": true,
      "sourceFlag": "catwallet_openclaw",
      "sourceType": "catwallet_openclaw",
      "equipmentNo": ""
    }
  },
  "tools": {
    "allow": [
      "omnibridge_get_coins",
      "omnibridge_get_quote",
      "omnibridge_create_order",
      "omnibridge_upload_tx",
      "omnibridge_query_order"
    ]
  }
}
```

## API Reference

- Base URL: `https://api.omnibridge.pro`
- Documentation: https://docs.en.omnibridge.pro/cross-chain-swap-api
- Success Code: `"800"`
- Failure Code: `"900"`

## Coin Code Format

Omnibridge uses specific coin code formats:

- Native tokens: `"ETH"`, `"BTC"`, `"SOL"`, `"TRX"`
- ERC20/BEP20 tokens: `"USDT(BSC)"`, `"USDT(ETH)"`, `"USDC(POLYGON)"`
- Format: `TOKEN(CHAIN)` where CHAIN is the mainNetwork value

## Amount Handling

- **Quote & Create Order**: Use amounts **WITHOUT** decimals (e.g., "100" for 100 USDT)
- **Platform Fee**: Deducted from deposit amount (typically 0.3%)
- **Chain Fee**: Separate gas fee for cross-chain transfer

## Order States

- `wait_deposits`: Waiting for user deposit
- `wait_send`: Processing swap
- `complete`: Swap completed
- `timeout`: Order timed out
- `refund`: Swap failed, refund issued

## Security Notes

1. Always verify deposit address from create_order response
2. Double-check coin codes and chain names
3. Validate quote before creating order
4. Save orderId for tracking
5. Only send exact amount specified in order

## License

MIT
