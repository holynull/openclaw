# 🔐 助记词密钥管理指南

## 📖 概述

softHSM-service 现在支持**基于助记词的密钥派生**。这意味着：

✅ **灾难恢复** - 即使 HSM volume 丢失，也能从助记词恢复所有密钥  
✅ **确定性派生** - 相同的助记词和账户索引永远生成相同的密钥  
✅ **安全存储** - 私钥仍然存储在 HSM 中，永不导出  
✅ **向后兼容** - 已有密钥继续使用，不受影响

---

## 🚀 快速开始

### 1. 生成新助记词

```bash
cd softHSM-service

# 运行助记词管理工具
chmod +x scripts/mnemonic-manager.ts
tsx scripts/mnemonic-manager.ts
```

选择选项 `1` 生成新助记词。

**⚠️ 极其重要：**

- 📝 将助记词**手写**在纸上
- 🚫 **永远不要**截图、拍照或保存在电脑上
- 🔒 将纸质备份存放在安全的地方（建议多个备份，不同位置）
- 🔑 任何人获得助记词都可以控制所有资产

### 2. 配置环境变量

**开发环境** (`.env` 文件):

```bash
WALLET_MNEMONIC="your twelve word mnemonic phrase here stored safely somewhere"
HD_PATH_PREFIX=m/44'/60'/0'/0
```

**生产环境** (推荐使用密钥管理服务):

```bash
# 使用 Docker secrets
echo "your mnemonic" | docker secret create wallet_mnemonic -

# 或使用环境变量（从安全存储读取）
export WALLET_MNEMONIC=$(vault read -field=mnemonic secret/wallet)
```

### 3. 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
docker-compose up -d
```

服务启动时会：

1. 检查 HSM 中是否已有密钥
2. 如果没有且配置了助记词，从助记词派生并导入
3. 如果都没有，生成随机密钥（⚠️ 无法恢复！）

---

## 🔄 密钥派生逻辑

```typescript
// 账户索引 0 的密钥派生路径
const hdPath = "m/44'/60'/0'/0/0";

// 账户索引 1 的密钥派生路径
const hdPath = "m/44'/60'/0'/0/1";

// 以此类推...
```

**相同的助记词 + 相同的账户索引 = 相同的私钥和地址**

---

## 🛡️ 灾难恢复流程

### 场景：HSM Volume 被删除

**❌ 没有助记词的后果：**

```
所有私钥永久丢失 → 资金无法访问 → 💸💸💸
```

**✅ 有助记词的恢复：**

```bash
# 1. 停止服务
docker-compose down

# 2. 删除损坏的 volume
docker volume rm hsm-data

# 3. 重新创建 volume
docker volume create hsm-data

# 4. 确保 WALLET_MNEMONIC 环境变量已设置
export WALLET_MNEMONIC="your twelve word mnemonic..."

# 5. 重新启动服务
docker-compose up -d

# 6. 验证密钥恢复
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/sign/address/ethereum/0
```

服务会自动从助记词重新派生所有密钥！🎉

---

## 🔍 验证助记词

```bash
# 验证你的助记词是否正确
tsx scripts/mnemonic-manager.ts

# 选择选项 2，输入助记词
# 会显示派生的前 5 个地址，确认是否与你预期的一致
```

---

## 📊 助记词 vs 随机密钥对比

| 特性       | 使用助记词      | 随机生成密钥        |
| ---------- | --------------- | ------------------- |
| 灾难恢复   | ✅ 可恢复       | ❌ 永久丢失         |
| 密钥确定性 | ✅ 确定         | ❌ 随机             |
| 安全性     | ⚠️ 需保护助记词 | ✅ 较安全（无单点） |
| 便携性     | ✅ 易于备份     | ❌ 需备份 volume    |
| 多设备同步 | ✅ 支持         | ❌ 困难             |

---

## 🔒 安全最佳实践

### ✅ 推荐做法

1. **纸质备份**
   - 手写助记词在纸上
   - 使用防水、防火的存储方式
   - 考虑钢板备份（防火）

2. **多重备份**
   - 至少 3 份备份
   - 存放在不同的安全位置
   - 家里 + 保险柜 + 可信赖的人

3. **分片存储**（高级）
   - 使用 Shamir Secret Sharing
   - 将助记词分成 3 份，任意 2 份可恢复
   - 分别存放在不同位置

4. **定期测试**
   - 每季度验证一次助记词
   - 确保备份可读且正确

5. **访问控制**
   - 生产环境使用密钥管理服务（AWS KMS, HashiCorp Vault）
   - 不要在代码或配置文件中明文存储
   - 使用环境变量 + 加密

### ❌ 禁止做法

1. ❌ 将助记词存储在电脑上
2. ❌ 截图或拍照助记词
3. ❌ 通过邮件、聊天软件传输
4. ❌ 存储在云盘、笔记软件
5. ❌ 与他人分享（除非紧急情况）
6. ❌ 使用弱助记词或自己编造

---

## 🔄 迁移现有部署

### 场景 1：从随机密钥迁移到助记词

**⚠️ 注意：这将生成新的密钥和地址！**

```bash
# 1. 生成助记词
tsx scripts/mnemonic-manager.ts  # 选项 1

# 2. 记录旧地址的资金
# 3. 停止服务
docker-compose down

# 4. 备份现有 HSM 数据（可选）
docker run --rm -v hsm-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/hsm-old-keys.tar.gz -C /data .

# 5. 删除旧密钥
docker volume rm hsm-data
docker volume create hsm-data

# 6. 配置助记词并启动
export WALLET_MNEMONIC="..."
docker-compose up -d

# 7. 获取新地址
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/sign/address/ethereum/0

# 8. 将旧地址的资金转移到新地址
```

### 场景 2：保持现有密钥，添加助记词保护

**如果你想保持现有地址不变，不要使用助记词！**  
助记词派生的密钥与随机生成的密钥不同。

**替代方案：**

- 定期备份 HSM volume
- 使用 volume 快照
- 多节点同步 HSM 数据

---

## 📝 常见问题

### Q1: 已有运行中的服务，现在添加助记词会怎样？

**A:** 现有密钥继续使用。新的账户索引会从助记词派生。已存在的密钥不会被覆盖。

### Q2: 可以修改助记词吗？

**A:** 修改助记词会导致派生出完全不同的密钥和地址！除非你想生成新密钥，否则不要修改。

### Q3: 忘记助记词怎么办？

**A:** 如果 HSM volume 还在，密钥仍然可用。但如果 volume 丢失，密钥无法恢复。

### Q4: 助记词泄露怎么办？

**A:**

1. 立即停止服务
2. 生成新助记词
3. 转移所有资金到新地址
4. 更新所有引用旧地址的地方

### Q5: 如何验证助记词备份是否正确？

**A:**

```bash
tsx scripts/mnemonic-manager.ts  # 选项 2
# 输入你备份的助记词
# 对比派生的地址是否与预期一致
```

### Q6: 可以使用 12/15/18/21/24 词的助记词吗？

**A:** 可以，EthWallet 支持标准的 BIP39 助记词（12-24 词）。

---

## 🎯 推荐配置

### 开发环境

```bash
# .env
WALLET_MNEMONIC="test test test test test test test test test test test junk"
```

使用测试助记词，方便开发调试。

### 生产环境

```bash
# docker-compose.yml
services:
  softHSM-service:
    environment:
      WALLET_MNEMONIC_FILE: /run/secrets/wallet_mnemonic
    secrets:
      - wallet_mnemonic

secrets:
  wallet_mnemonic:
    external: true
```

使用 Docker secrets 或密钥管理服务。

---

## 🆘 紧急恢复指南

**打印此部分，与助记词一起保存！**

### 恢复步骤

1. ✅ 找到助记词纸质备份
2. ✅ 准备一台干净的机器（建议离线）
3. ✅ 下载 softHSM-service 代码
4. ✅ 设置环境变量：`export WALLET_MNEMONIC="..."`
5. ✅ 运行服务：`docker-compose up -d`
6. ✅ 验证地址：查询 `/api/sign/address/ethereum/0`
7. ✅ 确认是预期的地址
8. ✅ 开始恢复业务

### 紧急联系方式

- 技术支持: [你的联系方式]
- 文档仓库: https://github.com/[your-repo]

---

## ✅ 检查清单

部署前确认：

- [ ] 已生成助记词并安全保存
- [ ] 已验证助记词正确性
- [ ] 已创建至少 3 份纸质备份
- [ ] 备份存放在不同的安全位置
- [ ] 已测试过助记词恢复流程
- [ ] 生产环境使用密钥管理服务
- [ ] 已配置自动备份 HSM volume
- [ ] 团队知道紧急恢复流程
- [ ] 已记录所有派生的地址

---

**记住：助记词就是一切。保护好它！** 🔐
