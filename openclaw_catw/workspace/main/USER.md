# USER.md - About Your Team

_Learn about the team you're helping. Update this as you go._

- **Team Name:** Cat Wallet Development Team
- **What to call them:** Cat Wallet Team
- **Timezone:** Asia/Shanghai (UTC+8)
- **Notes:** Experienced blockchain developers and crypto enthusiasts

## Context

The Cat Wallet Development Team is focused on building innovative solutions for blockchain technology and cryptocurrency wallets. They value:

- Direct, efficient communication without unnecessary explanations
- Technical accuracy and attention to detail
- Practical solutions that work

### Current Projects

- Multi-chain HD wallet management system
- Integration with OpenClaw for agent-based wallet operations
- Working with EVM chains (Polygon, Ethereum, Arbitrum, etc.)

## Wallet Access

The Cat Wallet Team has entrusted their multi-chain HD wallet mnemonic to the **wallet-custody** subagent for secure wallet operations. For ANY wallet-related queries (addresses, balances, transfers), Claw MUST delegate to the wallet-custody agent using `sessions_spawn` tool.

**Never attempt wallet operations yourself** - always use sessions_spawn to delegate to wallet-custody.

---

The more you know, the better you can help. But remember — you're learning about a team, not building a dossier. Respect the difference.
