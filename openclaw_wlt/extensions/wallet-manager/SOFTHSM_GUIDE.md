# OpenClaw Wallet Manager with SoftHSM Integration

## Overview

This guide explains how to configure `openclaw_wlt` (wallet custody instance) to use SoftHSM service for secure key management and transaction signing. The private keys are managed by SoftHSM service, providing enhanced security through HSM (Hardware Security Module) integration.

## Architecture

```
openclaw-gateway-2 (openclaw_wlt)
    ↓
wallet-manager extension
    ↓
SoftHSM Client
    ↓
SoftHSM Service (softhsm-service container)
    ↓
SoftHSM Library + Mnemonic Storage
```

## Prerequisites

1. SoftHSM service must be running (part of docker-compose setup)
2. API keys must be generated for authentication
3. openclaw-gateway-2 must be whitelisted in SoftHSM service

## Configuration Steps

### 1. Generate SoftHSM API Keys

First, generate API credentials for the wallet-manager to authenticate with SoftHSM service:

```bash
# Navigate to softHSM-service directory
cd softHSM-service

# Install dependencies if not already done
pnpm install

# Generate API key and secret
pnpm ts-node scripts/api-key-manager.ts create wallet-openclaw-wlt

# Output will be:
# API Key: api_xxxxxxxxxxxxx
# Secret: secret_yyyyyyyyyyy
# Hashed Key: <hash-value>
```

Save the API Key and Secret securely - you'll need them for the next step.

### 2. Configure Environment Variables

Add the following to your `.env` file (or the second instance's environment):

```bash
# SoftHSM Service Configuration
SOFTHSM_SERVICE_URL=http://softhsm-service:3000
SOFTHSM_API_KEY=api_xxxxxxxxxxxxx
SOFTHSM_API_SECRET=secret_yyyyyyyyyyy
```

### 3. Update SoftHSM Service VALID_API_KEYS

Add the hashed key from step 1 to the `VALID_API_KEYS` environment variable in your `.env`:

```bash
VALID_API_KEYS=<existing-hash>,<new-hash-from-step-1>
```

Or if this is the first key:

```bash
VALID_API_KEYS=<hash-from-step-1>
```

### 4. Verify ALLOWED_ORIGINS Configuration

The `docker-compose.yml` has already been configured to whitelist `openclaw-gateway-2`:

```yaml
softhsm-service:
  environment:
    - ALLOWED_ORIGINS=openclaw-gateway-2,${ALLOWED_ORIGINS:-*}
```

This allows openclaw-gateway-2 to access the SoftHSM service API.

### 5. Restart Services

Restart both the SoftHSM service and the second gateway instance:

```bash
# Restart SoftHSM service to apply new API keys
docker-compose restart softhsm-service

# Restart second instance with new environment variables
docker-compose --profile second-instance restart openclaw-gateway-2
```

### 6. Install Dependencies for Wallet Manager

Install axios dependency for the wallet-manager extension:

```bash
cd openclaw_wlt/extensions/wallet-manager
pnpm install
```

## Supported Features

### ✅ Ethereum Support

The following Ethereum operations are supported with SoftHSM:

- **eth_get_address**: Get Ethereum address for any account index
- **eth_get_balance**: Get ETH balance
- **eth_get_token_balance**: Get ERC20 token balance
- **eth_estimate_gas**: Estimate gas fees for transactions
- **eth_transfer**: Transfer ETH (signed by SoftHSM)
- **eth_transfer_token**: Transfer ERC20 tokens (signed by SoftHSM)
- **eth_get_transaction**: Get transaction details

### ❌ Not Yet Supported

- **eth_sign_message**: Message signing (requires SoftHSM API implementation)
- **btc_get_address**: Bitcoin operations (SoftHSM only supports Ethereum currently)
- **sol_get_address**: Solana operations (SoftHSM only supports Ethereum currently)

## Security Considerations

### Key Management

- Private keys **never** leave the SoftHSM service
- Mnemonic is stored securely in SoftHSM service volume
- All signing operations happen server-side

### Authentication

- API Key + Secret authentication
- HMAC-SHA256 request signature verification
- JWT tokens with 15-minute expiration
- Request timestamp and nonce for replay protection

### Network Security

- ALLOWED_ORIGINS whitelist restricts API access
- Only openclaw-gateway-2 can access SoftHSM service by default
- TLS/HTTPS should be used in production

## Usage Examples

### Get Ethereum Address

```bash
# Via OpenClaw CLI (configured with openclaw_wlt)
openclaw tools exec eth_get_address --accountIndex 0
```

### Transfer ETH

```bash
# Transfer 0.1 ETH to address
openclaw tools exec eth_transfer \
  --to 0x1234567890123456789012345678901234567890 \
  --amount "0.1" \
  --chainId 137 \
  --gasPreset medium
```

### Transfer ERC20 Token

```bash
# Transfer 100 USDT on Polygon
openclaw tools exec eth_transfer_token \
  --tokenAddress 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --to 0x1234567890123456789012345678901234567890 \
  --amount "100" \
  --chainId 137 \
  --gasPreset medium
```

## Troubleshooting

### Error: "SOFTHSM_API_KEY and SOFTHSM_API_SECRET must be set"

Solution: Ensure environment variables are properly set in .env file and container has been restarted.

### Error: "Login failed: Unauthorized"

Solution:

1. Verify API key and secret are correct
2. Check that the hashed key is in VALID_API_KEYS
3. Restart softhsm-service after updating VALID_API_KEYS

### Error: "CORS origin not allowed"

Solution: Verify that openclaw-gateway-2 is in the ALLOWED_ORIGINS list and softhsm-service has been restarted.

### Error: "Connection refused to softhsm-service:3000"

Solution:

1. Check that softhsm-service container is running: `docker ps | grep softhsm`
2. Verify network connectivity between containers
3. Check container logs: `docker logs wallet-softhsm-service`

### Error: "Message signing is not yet implemented"

Solution: This is expected - message signing requires additional SoftHSM service API implementation. Use only transaction signing features.

## Migration from Local Mnemonic

If you were previously using WALLET_MNEMONIC environment variable:

1. **Backup**: Save your existing mnemonic securely
2. **Initialize SoftHSM**: Import your mnemonic into SoftHSM service (see softHSM-service/MNEMONIC-GUIDE.md)
3. **Update Configuration**: Remove WALLET*MNEMONIC from environment and add SOFTHSM*\* variables
4. **Test**: Verify addresses match between old and new implementations

## References

- **SoftHSM Service Documentation**: [softHSM-service/README.md](../softHSM-service/README.md)
- **API Key Management**: [softHSM-service/scripts/api-key-manager.ts](../softHSM-service/scripts/api-key-manager.ts)
- **Security Guide**: [softHSM-service/SECURITY.md](../softHSM-service/SECURITY.md)
- **Mnemonic Management**: [softHSM-service/MNEMONIC-GUIDE.md](../softHSM-service/MNEMONIC-GUIDE.md)
