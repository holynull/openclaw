# SoftHSM 服务助记词备份指南

## 概述

当 SoftHSM 服务首次启动时，会自动生成一个新的助记词（Mnemonic Phrase）用于派生以太坊私钥。助记词是恢复所有私钥的唯一方式，必须妥善备份。

## 交互式备份脚本

我们提供了一个安全的交互式脚本来帮助您备份和删除助记词文件。

### 脚本功能

1. **显示助记词**：在安全的环境中显示完整助记词
2. **指导备份**：提供详细的安全备份指导
3. **验证备份**：要求输入前3个单词以确认正确备份
4. **安全删除**：使用 `shred` 命令安全删除备份文件

### 使用方法

#### 1. 查看服务日志

首次启动或恢复时，服务会在日志中提示：

```bash
docker logs wallet-softhsm-service
```

您会看到类似输出：

```
[WARN] ╔════════════════════════════════════════════════════════════════╗
[WARN] ║  🚨 IMPORTANT: BACKUP YOUR MNEMONIC PHRASE NOW! 🚨             ║
[WARN] ╚════════════════════════════════════════════════════════════════╝
[WARN]
[WARN] Your mnemonic phrase has been saved to:
[WARN]   📄 /var/lib/softhsm-wallet/mnemonic-backup.txt
[WARN]
[WARN] ⚠️  CRITICAL ACTIONS:
[WARN]   RECOMMENDED: Use the interactive backup script
[WARN]
[WARN]   Execute in the container:
[WARN]     docker exec -it wallet-softhsm-service sh /app/scripts/backup-mnemonic.sh
```

#### 2. 执行备份脚本

运行以下命令启动交互式备份流程：

```bash
docker exec -it wallet-softhsm-service sh /app/scripts/backup-mnemonic.sh
```

#### 3. 按照脚本提示操作

脚本将引导您完成以下步骤：

1. **安全警告**：确认在安全环境中操作
2. **显示助记词**：在屏幕上显示完整的助记词
3. **手写备份**：用纸笔抄写助记词
4. **验证备份**：输入前3个单词进行验证
5. **确认删除**：输入 `YES` 确认删除备份文件
6. **完成**：备份文件将被安全删除

### 示例流程

```bash
$ docker exec -it wallet-softhsm-service sh /app/scripts/backup-mnemonic.sh

╔════════════════════════════════════════════════════════════════╗
║                    ⚠️  安全警告 ⚠️                             ║
╚════════════════════════════════════════════════════════════════╝

此脚本将显示您的助记词（私钥种子）
请确保：
  1. 您在安全的环境中（无他人观看、无监控录像）
  2. 准备好纸笔进行手写备份
  3. 不要截图、拍照或复制到剪贴板

按 Enter 继续，或按 Ctrl+C 取消...

╔════════════════════════════════════════════════════════════════╗
║                   🔑 助记词 (Mnemonic)                         ║
╚════════════════════════════════════════════════════════════════╝

请用纸笔抄写以下助记词：

word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12

════════════════════════════════════════════════════════════════

📝 请在纸上按顺序抄写上述助记词

抄写完成后，按 Enter 继续...

╔════════════════════════════════════════════════════════════════╗
║                   ✅ 验证备份                                   ║
╚════════════════════════════════════════════════════════════════╝

为了确认您已正确备份，请输入助记词的前3个单词：

第1个单词: word1
第2个单词: word2
第3个单词: word3

✅ 验证成功！前3个单词匹配。

════════════════════════════════════════════════════════════════

⚠️  最终确认 ⚠️

您即将永久删除助记词备份文件。
删除后，只能通过您的纸质备份恢复密钥。

确认删除备份文件？(输入 'YES' 确认): YES

正在安全删除备份文件...
✅ 备份文件已通过 shred 安全删除

╔════════════════════════════════════════════════════════════════╗
║                   ✅ 备份流程完成                               ║
╚════════════════════════════════════════════════════════════════╝

重要提醒：
  ✅ 助记词备份文件已删除
  ✅ 纸质备份请妥善保管（建议多地存储）
  ✅ 服务重启时将直接使用 HSM 中的密钥
  ⚠️  如需恢复，请使用您的纸质助记词
```

## 手动备份方式

如果您更喜欢手动备份，可以按照以下步骤操作：

### 1. 查看助记词备份文件

```bash
docker exec wallet-softhsm-service cat /var/lib/softhsm-wallet/mnemonic-backup.txt
```

### 2. 手写备份

用纸笔抄写助记词（在 "MNEMONIC PHRASE:" 部分）

### 3. 验证备份

确认您已正确抄写所有单词

### 4. 安全删除备份文件

```bash
docker exec wallet-softhsm-service shred -u /var/lib/softhsm-wallet/mnemonic-backup.txt
```

或使用普通删除（不推荐）：

```bash
docker exec wallet-softhsm-service rm /var/lib/softhsm-wallet/mnemonic-backup.txt
```

## 安全注意事项

### ⚠️ 重要警告

- **永不共享**：切勿将助记词发送给任何人
- **离线备份**：纸质备份存储在多个安全的离线位置
- **避免数字备份**：不要截图、拍照或保存到云端
- **验证备份**：确保备份的助记词准确无误
- **安全删除**：使用 `shred` 命令安全删除电子副本

### ✅ 最佳实践

1. **多地存储**：在2-3个不同的安全地点存储备份
2. **防水防火**：使用防水防火的保险箱或密封袋
3. **定期检查**：定期检查备份是否完好
4. **家人知晓**：告知信任的家人备份位置（但不透露内容）
5. **测试恢复**：在测试环境中验证助记词可以恢复密钥

## 服务重启行为

### 正常情况（已备份并删除文件）

```
[INFO] PKCS#11 module loaded and initialized
[INFO] Token found
[INFO] HSM session opened and logged in
[INFO] Existing keys found in HSM, skipping mnemonic generation
[INFO] HSM Service initialized successfully
[INFO] 🚀 Signing Service running on http://0.0.0.0:3000
```

服务会直接使用 HSM 中已导入的密钥，不会重新生成助记词。

### 异常情况（备份文件存在但 HSM 无密钥）

```
[WARN] ⚠️  Mnemonic backup file exists but no keys in HSM
[INFO] 📥 Restoring keys from backup file...
[INFO] ✅ Keys restored from backup successfully

🔐 BACKUP REMINDER: Mnemonic backup file still exists

  To backup and delete securely, run:
    docker exec -it wallet-softhsm-service sh /app/scripts/backup-mnemonic.sh
```

服务会自动从备份文件恢复密钥到 HSM，并提示您完成备份流程。

## 恢复流程

如果需要从纸质助记词恢复服务：

### 1. 停止服务

```bash
docker-compose down
```

### 2. 清除现有 HSM 数据（可选）

```bash
docker volume rm softhsm-data
docker volume create softhsm-data
```

### 3. 重新初始化 Token

```bash
docker-compose up -d softhsm-service
docker exec wallet-softhsm-service softhsm2-util --init-token --slot 0 \
  --label wallet-custody \
  --pin test-pin-aae464ff1f72c4d4 \
  --so-pin test-so-pin-aae464ff1f72c4d4
```

### 4. 手动创建备份文件

将您的纸质助记词输入到备份文件：

```bash
docker exec -i wallet-softhsm-service sh -c 'cat > /var/lib/softhsm-wallet/mnemonic-backup.txt' <<'EOF'
════════════════════════════════════════════════════════════════
MNEMONIC PHRASE:
════════════════════════════════════════════════════════════════

your twelve word mnemonic phrase goes here word by word

════════════════════════════════════════════════════════════════
EOF
```

### 5. 重启服务

```bash
docker-compose restart softhsm-service
```

服务会自动从备份文件恢复密钥到 HSM。

### 6. 验证恢复

检查日志中的派生地址是否与原地址匹配：

```bash
docker logs wallet-softhsm-service | grep "address"
```

### 7. 再次备份（可选）

如果需要，可以再次运行备份脚本删除文件。

## 故障排查

### 脚本无法执行

**问题**：`permission denied` 错误

**解决**：

```bash
docker exec wallet-softhsm-service chmod +x /app/scripts/backup-mnemonic.sh
```

### 备份文件不存在

**问题**：脚本提示 "备份文件不存在"

**原因**：

- 备份文件已被删除
- HSM 中已有密钥，无需备份

**确认**：查看服务日志，如果显示 "Existing keys found in HSM"，说明密钥已安全存储。

### 验证失败

**问题**：输入的前3个单词验证失败

**解决**：

1. 仔细检查拼写（区分大小写）
2. 确保单词顺序正确
3. 重新运行脚本，更仔细地抄写

## 技术细节

### 文件位置

- **备份文件**：`/var/lib/softhsm-wallet/mnemonic-backup.txt`
- **HSM Token 数据**：`/var/lib/softhsm-wallet/[uuid]/`
- **脚本位置**：`/app/scripts/backup-mnemonic.sh`

### 密钥派生路径

- **HD 路径前缀**：`m/44'/60'/0'/0`
- **第一个地址**：`m/44'/60'/0'/0/0`
- **第二个地址**：`m/44'/60'/0'/0/1`
- 以此类推...

### 持久化机制

1. **助记词生成时**：生成 → 保存备份 → 导入第一个密钥到 HSM
2. **服务重启时**：检查 HSM → 发现有密钥 → 跳过生成
3. **数据恢复时**：检测备份文件 → 从备份导入 HSM → 提示删除备份

这样确保了即使删除备份文件，HSM 中的密钥也会持久化保存。

## 支持

如有问题，请查看：

- 服务日志：`docker logs wallet-softhsm-service`
- Docker Compose 日志：`docker-compose logs softhsm-service`
- 容器状态：`docker-compose ps`
