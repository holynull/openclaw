# 🚀 快速开始 - 使用助记词保护

## 第一步：生成助记词

```bash
cd softHSM-service

# 安装依赖
pnpm install

# 运行助记词管理工具
pnpm mnemonic
```

选择 `1` 生成新助记词，**手写在纸上并妥善保管**！

## 第二步：配置环境变量

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的助记词：

```bash
WALLET_MNEMONIC="your twelve word mnemonic phrase here"
```

⚠️ **生产环境建议**：使用密钥管理服务（AWS KMS, Vault）而不是明文存储。

## 第三步：初始化 HSM

```bash
# 运行设置脚本
chmod +x setup.sh
./setup.sh
```

这会：

- 安装 SoftHSM
- 初始化 Token
- 生成所需的配置

## 第四步：启动服务

```bash
# 开发模式
pnpm dev

# 或生产模式（Docker）
docker-compose up -d
```

## 第五步：验证

```bash
# 健康检查
curl http://localhost:3000/health/ready

# 登录获取 JWT
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"YOUR_API_KEY","secret":"YOUR_SECRET"}'

# 获取第一个地址
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/sign/address/ethereum/0
```

## ✅ 完成！

现在你的密钥由助记词保护，即使 Docker volume 丢失也能恢复！

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
