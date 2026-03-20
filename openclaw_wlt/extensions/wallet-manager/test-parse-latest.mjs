import { Transaction } from 'ethers';

// 最新的失败交易
const signedTx = "0xf8ab80850622267d9182eb9494c2132d05d31c914a87c6611c10748aeb04b58e8f80b844a9059cbb0000000000000000000000003f847a21bcfbba535a5e2a1611bb4d545541d2a500000000000000000000000000000000000000000000000000000000002dc7ec820135a04f0959cba5d0fe719eb2f9b2f34292e9cb4f5491080424b131648b4d2f1b6231a0b6c702ae3cf611bab08606ac56594bb8e6c71b80961ca684aa4aa7d050712ada";

try {
  const tx = Transaction.from(signedTx);
  console.log("\n=== 交易解析结果 ===");
  console.log("From (恢复):", tx.from);
  console.log("To:", tx.to);
  console.log("ChainId:", tx.chainId);
  console.log("Nonce:", tx.nonce);
  console.log("V 值:", tx.signature.v);
  console.log("R:", tx.signature.r);
  console.log("S:", tx.signature.s);
  
  // 计算期望的 v 值
  const expectedV = 137 * 2 + 35; // 309 或 310
  console.log("\n期望 V 值:", expectedV, "或", expectedV + 1);
  console.log("实际 V 值:", tx.signature.v);
  console.log("V 值正确?", tx.signature.v === expectedV || tx.signature.v === expectedV + 1);
  
  console.log("\n期望地址: 0x23cf90aafad730cca8c14d91d9741e0a86c229a0");
  console.log("实际地址:", tx.from);
  console.log("地址匹配?", tx.from.toLowerCase() === "0x23cf90aafad730cca8c14d91d9741e0a86c229a0");
} catch (e) {
  console.error("解析失败:", e.message);
}
