# 🚀 快速开始 - 自动生成助记词保护

## 工作流程概述

1. 🔧 配置环境并安装依赖
2. 🚀 首次启动服务（自动生成助记词）
3. ✋ 服务暂停，显示助记词备份文件路径
4. 📝 备份助记词到纸上
5. 🗑️ 删除助记词备份文件
6. 🔄 重启服务，开始使用

---

## 第一步：配置环境

```bash
cd softHSM-service

# 安装依赖
pnpm install

# 复制环境变量配置
cp .env.example .env
```

编辑 `.env` 文件，设置必需的配置：

```bash
HSM_PIN=your-secure-pin
JWT_SECRET=your-jwt-secret
API_KEY_SALT=your-api-key-salt
VALID_API_KEYS=hash1,hash2
```

## 第二步：初始化 HSM

```bash
# 运行设置脚本（仅首次需要）
chmod +x setup.sh
./setup.sh
```

这会：

- 安装 SoftHSM
- 初始化 Token
- 创建必要的目录

## 第三步：首次启动（重要！）

```bash
# 开发模式
pnpm dev

# 或 Docker 模式
docker-compose up softHSM-service
```

**⚠️ 首次启动时会发生什么：**

1. 系统检测到没有密钥
2. 自动生成一个新的助记词
3. 将助记词保存到 `mnemonic-backup.txt`
4. 在日志中显示警告信息
5. **服务自动停止，等待你备份助记词**

你会看到类似这样的输出：

```
╔════════════════════════════════════════════════════════════════╗
║  🚨 IMPORTANT: BACKUP YOUR MNEMONIC PHRASE NOW! 🚨             ║
╚════════════════════════════════════════════════════════════════╝

Your mnemonic phrase has been saved to:
  📄 /path/to/softHSM-service/mnemonic-backup.txt

⚠️  CRITICAL ACTIONS REQUIRED:
  1. STOP THE SERVICE NOW (automatically stopped)
  2. Open the backup file and WRITE DOWN the mnemonic on paper
  3. Store the paper backup in a safe place (multiple locations)
  4. VERIFY you have written it correctly
  5. DELETE the backup file after confirming
  6. Restart the service

Derived addresses (for verification):
  [0] 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  [1] 0x...
  [2] 0x...

After backing up, delete the file:
  rm /path/to/softHSM-service/mnemonic-backup.txt
```

## 第四步：备份助记词（关键！）

```bash
# 1. 查看助记词备份文件
cat mnemonic-backup.txt

# 2. 手写助记词到纸上
#    - 使用防水、防火的纸张
#    - 写清楚每个单词
#    - 标注日期和用途

# 3. 验证你写的是否正确
#    - 对比纸上的和文件中的
#    - 确保顺序正确
#    - 确保拼写正确

# 4. 存放纸质备份
#    - 存放在安全的地方（保险柜）
#    - 建议创建多份备份
#    - 存放在不同的位置
```

## 第五步：删除备份文件

**⚠️ 只有在确认已备份后才删除！**

```bash
# 方式1：普通删除
rm mnemonic-backup.txt

# 方式2：安全删除（推荐）
shred -u mnemonic-backup.txt  # Linux/macOS
```

## 第六步：重启服务

```bash
# 开发模式
pnpm dev

# Docker 模式
docker-compose up -d softHSM-service
```

这次服务会：

1. 检测到助记词备份文件不存在（已删除）
2. 检测到 HSM 中没有密钥
3. 警告你检查是否需要恢复
4. 等待你手动创建密钥

**如果需要创建第一个密钥：**

服务启动后，第一次请求地址时会自动从助记词派生密钥。

## 第七步：验证

```bash
# 健康检查
curl http://localhost:3000/health/ready

# 登录获取 JWT（先配置 API Key）
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"YOUR_API_KEY","secret":"YOUR_SECRET"}'

# 获取第一个地址（这会触发从助记词派生密钥）
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/sign/address/ethereum/0
```

验证地址是否与日志中显示的地址一致！

## ✅ 完成！

现在你的系统已经安全配置完成：

- ✅ 助记词已备份到纸上
- ✅ 备份文件已删除
- ✅ 密钥存储在 HSM 中
- ✅ 即使 volume 丢失也能从助记词恢复

---

## 🔄 灾难恢复

如果 Docker volume 丢失：

```bash
# 1. 停止服务
docker-compose down

# 2. 删除损坏的 volume
docker volume rm hsm-data

# 3. 重新创建 volume
docker volume create hsm-data

# 4. 创建助记词备份文件
cat > mnemonic-backup.txt << 'EOF'
your twelve word mnemonic phrase here stored on paper safely
EOF

# 5. 重启服务
docker-compose up -d softHSM-service

# 6. 请求地址触发密钥恢复
curl -H "Authorization: Bearer JWT" \
  http://localhost:3000/api/sign/address/ethereum/0

# 7. 验证地址正确后，删除备份文件
rm mnemonic-backup.txt
```

---

## 📚 详细文档

- **完整指南**: [MNEMONIC-GUIDE.md](./MNEMONIC-GUIDE.md)
- **API 文档**: [README.md](./README.md)
- **安全配置**: [SECURITY.md](./SECURITY.md)
- **迁移指南**: [MIGRATION.md](./MIGRATION.md)

---

## ⚠️ 重要提醒

1. **助记词就是一切** - 任何人获得助记词都能控制所有资产
2. **纸质备份** - 手写在纸上，不要电子存储
3. **多重备份** - 至少 3 份，存放在不同安全位置
4. **定期测试** - 确保备份可用且正确
5. **安全存储** - 生产环境使用密钥管理服务

---

## 🆘 需要帮助？

- 查看 [MNEMONIC-GUIDE.md](./MNEMONIC-GUIDE.md) 获取详细说明
- 查看 [FAQ](./README.md#faq) 常见问题
- 遇到问题请提 Issue
