# Omnibridge Extension Summary

## Overview

OpenClaw extension for cross-chain token swaps using Omnibridge platform. Supports 30+ blockchains including BTC, ETH, BSC, TRON, Solana, Polygon, Avalanche, and more.

## Key Features

✅ **Multi-Chain Support**: 30+ chains  
✅ **5 Tools**: Get coins, get quote, create order, upload tx, query status  
✅ **Platform-Based Swaps**: User sends to platform address (not smart contract)  
✅ **Order Tracking**: Full order lifecycle monitoring  
✅ **Automatic Refunds**: Failed swaps refunded automatically

## Architecture

```
User Request
    ↓
Agent (uses SKILL.md guidance)
    ↓
Omnibridge Tools (5 registered)
    ↓
API Client (src/api-client.ts)
    ↓
Omnibridge API (https://api.omnibridge.pro)
```

## Workflow Comparison

### Omnibridge vs Bridgers

| Feature            | Omnibridge                     | Bridgers                       |
| ------------------ | ------------------------------ | ------------------------------ |
| **Swap Method**    | Send to platform address       | Smart contract call            |
| **Tools**          | 5 tools                        | 5 tools                        |
| **Order Creation** | Before deposit                 | After deposit                  |
| **Amount Format**  | WITHOUT decimals (quote/order) | WITH decimals (all operations) |
| **Transaction**    | Standard transfer              | Contract interaction           |
| **Tracking**       | Upload tx hash required        | Automatic via order            |

### Omnibridge Workflow

1. **Get Coins** → Identify supported tokens and coin codes
2. **Get Quote** → Calculate exchange rate and fees
3. **Create Order** → Get platform deposit address
4. **Send Tokens** → User transfers to platform address
5. **Upload Hash** → Notify Omnibridge of deposit
6. **Track Order** → Monitor swap progress

### Bridgers Workflow

1. **Get Tokens** → Identify supported tokens
2. **Get Quote** → Calculate exchange rate and fees
3. **Approve Token** → ERC20 approval (if needed)
4. **Get Swap Data** → Generate transaction calldata
5. **Execute Swap** → Sign and broadcast transaction
6. **Create Order** → Register transaction hash
7. **Track Order** → Monitor swap progress

## Tools Reference

### 1. `omnibridge_get_coins`

- **Purpose**: Get supported tokens and chains
- **Returns**: Coin list with contract addresses, decimals
- **Use**: Identify coin codes for quotes

### 2. `omnibridge_get_quote`

- **Purpose**: Get exchange rate and fees
- **Parameters**: Coin codes (e.g., "USDT(BSC)"), amount WITHOUT decimals
- **Returns**: Exchange rate, fees, limits
- **Use**: Validate swap feasibility before order

### 3. `omnibridge_create_order`

- **Purpose**: Create swap order and get deposit address
- **Parameters**: Coin codes, amounts WITHOUT decimals, destination/refund addresses
- **Returns**: Order ID and platform deposit address
- **Use**: Initialize swap, get where to send tokens

### 4. `omnibridge_upload_tx`

- **Purpose**: Upload deposit transaction hash
- **Parameters**: Order ID, transaction hash
- **Returns**: Success confirmation
- **Use**: Notify Omnibridge to process swap

### 5. `omnibridge_query_order`

- **Purpose**: Check order status
- **Parameters**: Order ID
- **Returns**: Complete order details with transaction hashes
- **Use**: Track swap progress

## Integration Points

### Required Extensions

- **wallet-manager**: For sending transactions
  - `eth_get_address`: Get user wallet
  - `eth_transfer`: Send ERC20 tokens
  - `eth_send_transaction`: Send native tokens

### Optional Extensions

- **None**: Omnibridge is self-contained

## Configuration

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

## Key Differences from Bridgers

### Amount Handling

**Omnibridge**:

- Quote/Order: `"100"` (without decimals)
- Transaction: `"100000000000000000000"` (with decimals)

**Bridgers**:

- All operations: `"100000000000000000000"` (with decimals)

### Coin Code Format

**Omnibridge**:

- `"USDT(BSC)"` - Token on specific chain
- `"ETH"` - Native token on native chain

**Bridgers**:

- Chain: `"BSC"` (separate parameter)
- Address: `"0x55d3..."` (contract address)

### Execution Flow

**Omnibridge**:

1. Create order → Get platform address
2. Send to platform address
3. Upload transaction hash
4. Wait for processing

**Bridgers**:

1. Get swap data → Generate calldata
2. Execute contract call
3. Create order with hash
4. Wait for processing

## Security Notes

1. **Verify Platform Address**: Always check platform address from order response
2. **Coin Code Validation**: Use exact coin codes from API
3. **Amount Verification**: Double-check amounts WITHOUT decimals in orders
4. **Address Confirmation**: Verify destination and refund addresses
5. **Order Tracking**: Save order ID for later queries

## Error Handling

| Error                | Solution                                      |
| -------------------- | --------------------------------------------- |
| Invalid coin code    | Use `omnibridge_get_coins` to get exact codes |
| Amount out of range  | Check min/max limits from quote               |
| Order creation fails | Verify all parameters match quote             |
| Transaction fails    | Check platform address, token, amount         |
| Order times out      | Refund automatic to refundAddr                |

## Performance

- **API Latency**: 500-2000ms per call
- **Swap Time**: 5-30 minutes (chain dependent)
- **Order Timeout**: Typically 24 hours
- **Supported Chains**: 30+ blockchains

## Files Created

```
openclaw_wlt/extensions/omnibridge/
├── src/
│   └── api-client.ts          # API client with Omnibridge integration
├── index.ts                    # Extension entry point (5 tools)
├── package.json                # Dependencies (axios, typebox)
├── openclaw.plugin.json        # Plugin metadata
├── README.md                   # Extension documentation
├── DEPLOYMENT.md               # Deployment guide
└── SUMMARY.md                  # This file

openclaw_wlt/workspace/main/skills/
└── omnibridge_swap/
    └── SKILL.md                # Comprehensive agent skill guide
```

## Next Steps

1. **Review**: Check all files for accuracy
2. **Configure**: Add to `openclaw.json`
3. **Deploy**: Push to server and restart gateway
4. **Test**: Run test workflows
5. **Monitor**: Check logs for successful registration

## Maintenance

- **Updates**: Pull from Omnibridge API docs for new features
- **Monitoring**: Check gateway logs for errors
- **Testing**: Periodically test complete workflow
- **Documentation**: Keep SKILL.md updated with API changes

## Comparison Summary

| Aspect               | Omnibridge                | Bridgers                        |
| -------------------- | ------------------------- | ------------------------------- |
| **Complexity**       | Medium                    | Higher                          |
| **User Steps**       | 5 steps                   | 7+ steps                        |
| **Approval**         | Not needed                | Required for ERC20              |
| **Transaction Type** | Simple transfer           | Contract call                   |
| **Best For**         | Simple swaps, many chains | DeFi integration, complex swaps |
