# Omnibridge Extension Deployment Guide

## Installation

The extension is already configured in your OpenClaw workspace at:

```
openclaw_wlt/extensions/omnibridge/
```

## Configuration

Add to your `openclaw.json`:

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

## Server Deployment

### 1. Push to Server

```bash
# From your local machine
cd openclaw_wlt
git add extensions/omnibridge
git commit -m "feat: add Omnibridge extension for cross-chain swaps"
git push
```

### 2. Pull on Server

```bash
# SSH to server
ssh openclaw

# Navigate to openclaw directory
cd /home/ec2-user/github.com/holynull/openclaw

# Pull latest changes
git pull
```

### 3. Update Dependencies

If needed, install dependencies on server:

```bash
# Inside openclaw directory
cd openclaw_wlt/extensions/omnibridge
npm install
```

### 4. Update Configuration

Edit the OpenClaw config on server:

```bash
# Edit config file
nano ~/.openclaw2/openclaw.json
```

Add the omnibridge configuration from above.

### 5. Restart Gateway

```bash
# Stop current gateway
docker compose down

# Start with new configuration
docker compose up -d

# Check logs
docker logs -f openclaw-openclaw-gateway-1
```

### 6. Verify Installation

```bash
# Check if tools are registered
docker exec openclaw-openclaw-gateway-1 openclaw gateway status
```

You should see the 5 omnibridge tools listed.

## Testing

### Test 1: Get Coin List

```bash
# Via CLI
docker compose run --rm openclaw-cli agent message --message "使用 omnibridge_get_coins 查询 BSC 上支持的代币"
```

Expected: List of coins on BSC chain

### Test 2: Get Quote

```bash
docker compose run --rm openclaw-cli agent message --message "使用 omnibridge_get_quote 获取 USDT 从 BSC 到 ETH 的报价，金额 100"
```

Expected: Quote with exchange rate and fees

### Test 3: Complete Workflow

Test the complete swap workflow through the agent conversation.

## Troubleshooting

### Tools Not Showing

1. Check if extension is enabled in `openclaw.json`
2. Verify tools are in `tools.allow` list
3. Check gateway logs for errors
4. Restart gateway

### API Errors

1. Verify API endpoint: `https://api.omnibridge.pro`
2. Check network connectivity
3. Review API response in logs
4. Validate coin codes and parameters

### Transaction Failures

1. Verify platform address from order response
2. Check token contract address and decimals
3. Ensure sufficient gas for transaction
4. Verify chain ID is correct

## Monitoring

### Check Gateway Status

```bash
docker exec openclaw-openclaw-gateway-1 openclaw gateway status --deep
```

### View Logs

```bash
# Real-time logs
docker logs -f openclaw-openclaw-gateway-1

# Last 100 lines
docker logs --tail 100 openclaw-openclaw-gateway-1
```

### Check Extension Loading

Look for this line in logs:

```
[info] omnibridge: Registered 5 tools
```

## Uninstallation

To remove the extension:

1. Remove from config:

```json
{
  "extensions": {
    "omnibridge": {
      "enabled": false
    }
  }
}
```

2. Remove tools from allow list

3. Restart gateway

## Notes

- Omnibridge extension requires wallet-manager for sending transactions
- Ensure wallet-manager tools are also enabled: `eth_get_address`, `eth_transfer`, `eth_send_transaction`
- Extension has no external dependencies beyond axios
- All API calls go to `https://api.omnibridge.pro`
- No API key required

## Support

For issues:

1. Check server logs
2. Verify configuration
3. Test API connectivity
4. Review SKILL.md for workflow details
