import { Transaction } from 'ethers';

const signedTx = "0xf8ab808505fc9788bf82eb9494c2132d05d31c914a87c6611c10748aeb04b58e8f80b844a9059cbb0000000000000000000000003f847a21bcfbba535a5e2a1611bb4d545541d2a500000000000000000000000000000000000000000000000000000000002dc7ec820135a0d82feb836c4a97cd625770c17c8f396a2befb40031d47dfa30cfc2b6010e9d14a07b68d55fa62f6be8a178230dd76168d5ff0527a3b96c4eddc4505a284ad1ec9e";

const tx = Transaction.from(signedTx);

console.log("\n从已签名交易中恢复的信息：");
console.log("From:", tx.from);
console.log("To:", tx.to);
console.log("Nonce:", tx.nonce);
console.log("ChainId:", tx.chainId);
console.log("GasPrice:", tx.gasPrice?.toString(), "wei");
console.log("GasLimit:", tx.gasLimit?.toString());
console.log("Value:", tx.value?.toString());
console.log("\n交易摘要：从", tx.from, "发送到", tx.to);
