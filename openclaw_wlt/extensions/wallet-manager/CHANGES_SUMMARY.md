# SoftHSM Integration - Changes Summary

## Overview

This document summarizes the changes made to integrate SoftHSM service for secure private key management in the `openclaw_wlt` wallet custody instance.

## Changes Made

### 1. Docker Compose Configuration

**File**: `docker-compose.yml`

**Change**: Added `openclaw-gateway-2` to the SoftHSM service ALLOWED_ORIGINS whitelist

```yaml
softhsm-service:
  environment:
    - ALLOWED_ORIGINS=openclaw-gateway-2,${ALLOWED_ORIGINS:-*}
```

This allows the second OpenClaw gateway instance to access the SoftHSM service API.

### 2. SoftHSM Client Module

**File**: `openclaw_wlt/extensions/wallet-manager/softhsm-client.ts` (NEW)

**Purpose**: Provides a client library for interacting with SoftHSM service API

**Features**:

- JWT authentication with automatic token refresh
- HMAC-SHA256 request signature verification
- Automatic retry on 401 errors
- Singleton pattern with `getSoftHSMClient()` factory

**Key Methods**:

- `login()`: Authenticate and get JWT token
- `getEthereumAddress(accountIndex)`: Get Ethereum address for account
- `signEthereumTransaction(params)`: Sign Ethereum transaction
- `healthCheck()`: Check service health

### 3. Wallet Manager Extension Refactor

**File**: `openclaw_wlt/extensions/wallet-manager/index.ts`

**Major Changes**:

- Removed local mnemonic-based private key derivation
- Integrated SoftHSM client for all Ethereum operations
- Updated all Ethereum tools to use SoftHSM API

**Modified Tools**:

| Tool                    | Status       | Changes                               |
| ----------------------- | ------------ | ------------------------------------- |
| `eth_get_address`       | ✅ Updated   | Uses SoftHSM's `getEthereumAddress()` |
| `eth_get_balance`       | ✅ Updated   | Gets address from SoftHSM             |
| `eth_get_token_balance` | ✅ Updated   | Gets address from SoftHSM             |
| `eth_estimate_gas`      | ✅ Updated   | Gets from address from SoftHSM        |
| `eth_transfer`          | ✅ Updated   | Signs transaction via SoftHSM         |
| `eth_transfer_token`    | ✅ Updated   | Signs ERC20 transfer via SoftHSM      |
| `eth_sign_message`      | ⚠️ Disabled  | Requires SoftHSM API implementation   |
| `eth_get_transaction`   | ✅ No change | Read-only, no signing needed          |
| `btc_get_address`       | ❌ Disabled  | Bitcoin not supported by SoftHSM      |
| `sol_get_address`       | ❌ Disabled  | Solana not supported by SoftHSM       |

**Key Implementation Details**:

- All private key operations now happen server-side in SoftHSM
- Transaction signing returns `signatureId` for audit trail
- ERC20 transfers encode contract call in `data` field
- Gas estimation and fee calculation remain client-side

### 4. Package Dependencies

**File**: `openclaw_wlt/extensions/wallet-manager/package.json`

**Change**: Added axios dependency for HTTP client

```json
{
  "dependencies": {
    "axios": "^1.7.2"
  }
}
```

### 5. Environment Variables

**File**: `.env.example`

**Added Section**: SoftHSM Service Configuration

```bash
# SoftHSM Service URL
SOFTHSM_SERVICE_URL=http://softhsm-service:3000

# API Credentials
SOFTHSM_API_KEY=your-api-key
SOFTHSM_API_SECRET=your-api-secret

# Server Configuration (for softhsm-service container)
JWT_SECRET=change-me-in-production
HSM_PIN=your-hsm-pin
API_KEY_SALT=change-me-in-production
VALID_API_KEYS=hashed-key-1,hashed-key-2
```

### 6. Documentation

**File**: `openclaw_wlt/extensions/wallet-manager/SOFTHSM_GUIDE.md` (NEW)

**Content**:

- Architecture overview
- Step-by-step configuration guide
- API key generation instructions
- Supported features matrix
- Security considerations
- Usage examples
- Troubleshooting guide
- Migration instructions from local mnemonic

## Security Improvements

### Before (Local Mnemonic)

- 🔓 Mnemonic stored in environment variable
- 🔓 Private keys derived in application memory
- 🔓 Signing happens in application process
- ⚠️ Keys exposed to application code

### After (SoftHSM)

- 🔒 Mnemonic secured in HSM volume
- 🔒 Private keys never leave HSM service
- 🔒 Signing happens server-side in HSM
- 🔒 Keys isolated from application
- 🔒 Request signature verification
- 🔒 JWT token authentication
- 🔒 CORS origin whitelist
- 🔒 Audit trail with signature IDs

## API Flow

```
User Request
    ↓
OpenClaw Gateway-2
    ↓
wallet-manager extension
    ↓
SoftHSM Client
    ↓ (JWT + HMAC signature)
SoftHSM Service API
    ↓
HSM Service Logic
    ↓
Private Key (in memory)
    ↓
Sign Transaction
    ↓
Return Signed TX
```

## Configuration Checklist

- [ ] Generate SoftHSM API keys using `api-key-manager.ts`
- [ ] Add API key hash to `VALID_API_KEYS` in `.env`
- [ ] Set `SOFTHSM_API_KEY` and `SOFTHSM_API_SECRET` in `.env`
- [ ] Verify `ALLOWED_ORIGINS` includes `openclaw-gateway-2`
- [ ] Restart `softhsm-service` container
- [ ] Restart `openclaw-gateway-2` container
- [ ] Install dependencies: `cd openclaw_wlt/extensions/wallet-manager && pnpm install`
- [ ] Test address generation: `openclaw tools exec eth_get_address`
- [ ] Verify health: `curl http://softhsm-service:3000/health/ready`

## Testing Commands

```bash
# Test address generation
openclaw tools exec eth_get_address --accountIndex 0

# Test balance check
openclaw tools exec eth_get_balance \
  --chainId 137 \
  --address 0x...

# Test ETH transfer (testnet recommended)
openclaw tools exec eth_transfer \
  --to 0x... \
  --amount "0.01" \
  --chainId 80002 \
  --gasPreset medium

# Test ERC20 transfer (testnet recommended)
openclaw tools exec eth_transfer_token \
  --tokenAddress 0x... \
  --to 0x... \
  --amount "1" \
  --chainId 80002
```

## Breaking Changes

⚠️ **Important**: This update introduces breaking changes:

1. **Environment Variables**:
   - `WALLET_MNEMONIC` is no longer used
   - Must set `SOFTHSM_API_KEY` and `SOFTHSM_API_SECRET`

2. **Disabled Features**:
   - Message signing (`eth_sign_message`) requires SoftHSM API update
   - Bitcoin operations not supported
   - Solana operations not supported

3. **Migration Required**:
   - Existing installations must migrate mnemonic to SoftHSM service
   - See `SOFTHSM_GUIDE.md` for migration instructions

## Files Changed

1. `docker-compose.yml` - Added ALLOWED_ORIGINS whitelist
2. `openclaw_wlt/extensions/wallet-manager/softhsm-client.ts` - NEW client module
3. `openclaw_wlt/extensions/wallet-manager/index.ts` - Refactored to use SoftHSM
4. `openclaw_wlt/extensions/wallet-manager/package.json` - Added axios dependency
5. `.env.example` - Added SoftHSM configuration section
6. `openclaw_wlt/extensions/wallet-manager/SOFTHSM_GUIDE.md` - NEW documentation
7. `openclaw_wlt/extensions/wallet-manager/CHANGES_SUMMARY.md` - This file

## Next Steps

1. **Immediate Actions**:
   - Review and test the changes in a development environment
   - Generate API credentials for production
   - Update production `.env` files

2. **Optional Enhancements**:
   - Implement message signing API in SoftHSM service
   - Add Bitcoin support to SoftHSM service
   - Add Solana support to SoftHSM service
   - Implement transaction approval workflow
   - Add multi-signature support

3. **Monitoring**:
   - Check SoftHSM service logs: `docker logs wallet-softhsm-service`
   - Review audit logs: `/var/log/softHSM-service/audit.log`
   - Monitor JWT token refresh rate
   - Track failed authentication attempts

## Support

For questions or issues:

- Review `SOFTHSM_GUIDE.md` for configuration help
- Check `softHSM-service/README.md` for service documentation
- Review `softHSM-service/SECURITY.md` for security details
- Check Docker container logs for errors
