# TOOLS.md - Wallet Custody Agent

Deployment-specific configuration. See `wallet_custody_manager` SKILL for operational guides.

## Environment

```bash
WALLET_MNEMONIC: [Docker secrets]
INFURA_KEY: [Optional]
Environment: [Dev/Staging/Prod]
Custody Established: [YYYY-MM-DD]
User: [identifier]
```

### Networks

Ethereum (1), Sepolia (11155111), Polygon (137), Polygon Amoy (80002), Arbitrum (42161), Arbitrum Sepolia (421614), Optimism (10), Optimism Sepolia (11155420), Base (8453), Base Sepolia (84532), Avalanche (43114), Linea (59144)

## Token Addresses

### Stablecoins
**USDT**: ETH 0xdAC1...1ec7, Polygon 0xc213...e8F, Arbitrum 0xFd08...Cbb9  
**USDC**: ETH 0xA0b8...eB48, Polygon 0x2791...d0F4, Arbitrum 0xaf88...e5831, Base 0x8335...2913  
**DAI**: ETH 0x6B17...1d0F, Polygon 0x8f3C...3239, Arbitrum 0xDA10...0da1

### Wrapped
**WETH**: ETH 0xC02a...6Cc2, Polygon 0x7ceB...f619, Arbitrum 0x82aF...Bab1, Base 0x4200...0006  
**WBTC**: ETH 0x2260...2C599, Polygon 0x1BFD...BfD6, Arbitrum 0x2f2a...A8c7

### DeFi
**LINK**: ETH 0x5149...86CA, Polygon 0x53E0...ad39, Arbitrum 0xf97f...39FB4  
**UNI**: ETH 0x1f98...F984, Polygon 0xb33E...180f, Arbitrum 0xFa7F...1F7f0

## Account Tracking

**ETH** (m/44'/60'/0'/0/index): 0-Main, 1-Trading, 2-Gas  
**BTC** (m/44'/0'/0'/0/index): 0-Main, 1-Cold  
**SOL** (m/44'/501'/index'/0'): 0-Main, 1-NFT

## Preferences

USDC→Polygon (low gas), USDT→Ethereum (liquidity), DeFi→Arbitrum (low fees)

## Security

**Access**: [Team], User (owner)  
**Audit**: [YYYY-MM-DD]  
**Alerts**: Large txs, Failed txs, High gas, Approvals  
**Monitoring**: [Etherscan/Polygonscan], [Email/Telegram]

## Emergency

### Compromise
1. Stop container
2. Alert user - ALL chains at risk  
3. Assist recovery to new wallet
4. Never reuse mnemonic
5. Audit logs
6. Document

**Contact**: [Team/User]

### Revocation
1. User initiates
2. Verify identity
3. Stop container
4. Provide audit log
5. Wipe WALLET_MNEMONIC
6. Document

## Maintenance

**Daily**: Health, monitor, logs  
**Weekly**: Verify mnemonic, review ops, access  
**Monthly**: Access review, test emergency, status report  
**Quarterly**: Audit, update procedures, compliance

## Reminders

🤝 Fiduciary duty | 🛡️ Never expose keys | ⚠️ Verify before sign | 🚫 Refuse suspicious | 📊 Audit trail | 📞 User: [contact] | 🆘 User can revoke anytime

---

**Operations**: See `wallet_custody_manager` SKILL

## 🔑 Custody Environment Configuration

### WALLET_MNEMONIC Custody Setup
