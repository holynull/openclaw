---
name: blockchain-project-weekly
description: |
  📦 区块链项目周报生成与发送

  汇总一周内区块链项目更新，包含：
  - 🏗️ Layer1/Layer2 (Ethereum, Polygon, Celestia)
  - ⚙️ 基础设施 (Chainlink, Alchemy, QuickNode)
  - 💼 DeFi/应用
  - 🔐 钱包/安全
  - 📚 开发者资源

  数据源：9个项目RSS，使用 web_fetch
  输出格式：飞书文档 + 摘要消息
---

# 区块链项目周报生成 Skill

## 任务目标

生成区块链项目周报并发送到飞书群，汇总本周各主要项目的技术更新和生态进展。

## 📰 数据源

使用 `web_fetch` 工具获取9个项目RSS，提取最近7天的更新

## 📝 报告格式（Feishu Markdown）

```markdown
# 📦 区块链项目周报

第{周数}周 ({日期范围})

---

## 📋 本周焦点

• 核心更新X项
• 重要发布Y个
• 生态合作Z次

---

## 🏗️ Layer1/Layer2

### Ethereum

#### 更新标题

⏰ 发布时间  
🔧 技术要点：协议升级/性能优化  
🔗 [详情](url)

### Polygon

#### 更新标题

（同上格式）

### Celestia

#### 更新标题

（同上格式）

---

## ⚙️ 基础设施

### Chainlink (预言机)

#### 更新标题

⏰ 时间  
🤝 合作生态/🔧 技术更新  
🔗 [详情](url)

### Alchemy / QuickNode (节点服务)

#### 更新标题

（同上格式）

---

## 💼 DeFi/应用

### Synthetix

#### 更新标题

（同上格式）

---

## 🔐 钱包/安全

### Casa / Blockstream

#### 更新标题

（同上格式）

---

## 📚 开发者资源

• 新文档/工具/教程列表

---

📊 本周统计：X个项目 Y条更新
```

## 4️⃣ 保存并发送

### 步骤1：创建飞书文档

使用 `feishu_doc` 工具：

```
action: 'create'
title: '📦 区块链项目周报 | {日期}'
grant_to_requester: true
```

### 步骤2：写入报告内容

使用 `feishu_doc` 工具：

```
action: 'write'
doc_token: {从步骤1获取的document_id}
content: {完整报告Markdown内容，使用标准格式}
```

### 步骤3：生成摘要并发送到群

使用 `bash` 工具创建摘要文件：

```bash
SUMMARY_FILE="/tmp/blockchain-project-weekly-$(date +%Y%m%d).txt"
cat > "$SUMMARY_FILE" << 'EOFSUM'
📦 项目更新：{总数}

📄 完整报告文档：
{从步骤1获取的飞书文档URL}

数据来源：{来源数}
EOFSUM
```

然后使用 `send_feishu_file_content` 工具：

```
filePath: 摘要文件路径
chatId: 'oc_53d1a541f08d2d9f2e8c3c79a1f12fc3'
title: '📦 区块链项目周报'
maxLength: 1000
```

## ⚠️ 注意事项

1. 所有步骤必须成功完成
2. 使用标准Markdown格式（### 标题，不要用 • \*\* 等符号）
3. 确保文档中所有URL完整可点击
