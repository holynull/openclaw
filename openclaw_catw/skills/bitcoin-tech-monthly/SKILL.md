---
name: bitcoin-tech-monthly
description: |
  ₿ 比特币技术月报生成与发送

  汇总一个月内比特币技术进展，包含：
  - ⚙️ 协议 & BIP提案
  - ⚡ Lightning Network
  - 🔐 隐私技术
  - 🏦 钱包 & 自主保管
  - 🔗 侧链 & Layer2
  - 🛠️ 开发者工具
  - 📈 网络数据统计

  数据源：5个RSS，优先web_fetch，不足时web_search降级
  输出格式：飞书文档 + 摘要消息
---

# 比特币技术月报生成 Skill

## 任务目标

生成比特币技术月报并发送到飞书群，汇总协议更新、闪电网络进展和生态发展。

## 📰 数据源策略（降级方案）

### 优先方案：web_fetch（免费）

使用 `web_fetch` 工具获取5个Bitcoin RSS，提取最近30天的内容

### 降级方案：web_search

**触发条件**：当从RSS中提取的技术更新<8条时，使用 `web_search` 补充

搜索策略（每个关键词 count=5，freshness="month"）：

- "Bitcoin BIP proposal" - BIP提案
- "Lightning Network update" - 闪电网络进展
- "Bitcoin Core release" - Bitcoin Core更新
- "Taproot activation" - Taproot相关进展
- "Bitcoin privacy technology" - 比特币隐私技术
- "Bitcoin mining difficulty" - 挖矿难度调整

**质量要求**：

- 优先选择Bitcoin Optech、开发者博客、官方发布的内容
- 至少收集12条有效技术更新
- 每条包含：类型（协议/网络/工具）、技术要点、影响、来源链接

## 📝 报告格式（Feishu Markdown）

```markdown
# ₿ 比特币技术月报

{年月} ({日期范围})

---

## 📋 本月概览

🔧 协议更新：X项  
⚡ Lightning进展：Y个  
📊 网络数据：算力/难度/费用变化

---

## ⚙️ 协议 & BIP提案

### BIP-XXX / 软分叉提案 - Bitcoin Optech

📋 提案内容：（Taproot后续/新特性）  
🔧 技术细节  
📊 社区讨论进展  
🔗 [详情](url)

---

## ⚡ Lightning Network

### 闪电网络更新 - Blockstream / Optech

⚡ 协议改进：（路由优化/通道管理）  
📊 网络数据：  
• 节点数：XXX
• 通道数：XXX
• 容量：X BTC

💡 新功能  
🔗 [详情](url)

---

## 🔐 隐私技术

### Coinjoin / Schnorr 签名

🔐 隐私增强方案  
🛠️ 实现进展  
🔗 [详情](url)

### Zcash 隐私技术 - Electric Coin / Zcash Foundation

🔐 零知识证明应用  
🔧 协议更新  
🔗 [详情](url)

---

## 🏦 钱包 & 自主保管

### Casa 多签钱包 / 硬件钱包更新

🔐 安全特性  
🛠️ 新功能：（多签/恢复）  
💡 最佳实践  
🔗 [详情](url)

---

## 🔗 侧链 & Layer2

### Liquid / RGB / BitVM

🏗️ 侧链进展  
⚡ Layer2扩展方案  
🔧 技术实现  
🔗 [详情](url)

---

## 🛠️ 开发者工具

### Bitcoin Core 更新

📦 版本：vX.X  
🔧 新特性/Bug修复  
📚 开发库更新  
🔗 [Release Notes](url)

---

## 📈 网络数据统计

📊 算力：XXX EH/s (↑/↓ X%)  
⛏️ 难度：XXX T (调整周期)  
💰 平均费用：X sat/vB  
📦 交易量：XXX万笔/天  
🔗 [数据来源](mempool.space)

---

📊 本月统计：X项技术更新 | Y个生态进展  
💡 技术趋势：（月度总结）
```

## 4️⃣ 保存并发送

### 步骤1：创建飞书文档

使用 `feishu_doc` 工具：

```
action: 'create'
title: '₿ 比特币技术月报 | {日期}'
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
SUMMARY_FILE="/tmp/bitcoin-tech-monthly-$(date +%Y%m%d).txt"
cat > "$SUMMARY_FILE" << 'EOFSUM'
₿ 技术进展：{总数}

📄 完整报告文档：
{从步骤1获取的飞书文档URL}

数据来源：{来源数}
EOFSUM
```

然后使用 `send_feishu_file_content` 工具：

```
filePath: 摘要文件路径
chatId: 'oc_53d1a541f08d2d9f2e8c3c79a1f12fc3'
title: '₿ 比特币技术月报'
maxLength: 1000
```

## ⚠️ 注意事项

1. 所有步骤必须成功完成
2. 使用标准Markdown格式（### 标题，不要用 • \*\* 等符号）
3. 确保文档中所有URL完整可点击
