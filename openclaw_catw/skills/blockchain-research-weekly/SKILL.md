---
name: blockchain-research-weekly
description: |
  🔬 区块链研究周报生成与发送

  汇总一周内区块链研究与投资动态，包含：
  - 💡 VC观点与市场分析
  - 📈 链上数据与合规分析
  - 💼 融资动态
  - 🔬 深度研究
  - 🌐 宏观环境

  数据源：8个机构RSS，使用 web_fetch
  输出格式：飞书文档 + 摘要消息
---

# 区块链研究周报生成 Skill

## 任务目标

生成区块链研究周报并发送到飞书群，汇总VC观点、链上数据、融资动态和深度研究。

## 📰 数据源

使用 `web_fetch` 工具获取8个机构RSS，提取最近7天的内容

## 📝 报告格式（Feishu Markdown）

```markdown
# 🔬 区块链研究周报

第{周数}周 ({日期})

---

## 📋 本周摘要

📈 链上数据亮点  
💰 融资总额：$XXX万  
🔥 热门赛道：XXX

---

## 💡 VC观点与市场分析

### 标题 - Multicoin Capital

⏰ 发布时间  
💭 核心观点：（100字内概括）  
🎯 看好方向：XXX赛道  
🔗 [完整报告](url)

### 标题 - Outlier Ventures / Placeholder

（同上格式）

---

## 📈 链上数据与合规分析

### 标题 - Chainalysis

📊 关键数据：  
• 链上交易量：↑/↓ X%
• 活跃地址：XXX万
• 资金流向：XXX

🔗 [详情](url)

### 标题 - Elliptic (合规分析)

（同上格式）

---

## 💼 融资动态

### 项目名 完成 $XXX 融资

💰 金额：Series X / 种子轮  
🏢 领投：XXX  
🎯 赛道：DeFi/NFT/Layer2等  
🔗 [来源](url)

---

## 🔬 深度研究

### 报告标题

✍️ 作者：机构名 / 分析师  
🎯 主题：技术分析/市场研究  
💡 核心洞察：（关键结论）  
🔗 [原文](url)

---

## 🌐 宏观环境

### Lyn Alden 宏观分析

📊 经济环境影响  
💭 对加密市场的看法  
🔗 [详情](url)

---

📊 本周统计：X篇研究 | Y笔融资
```

## 4️⃣ 保存并发送

### 步骤1：创建飞书文档

使用 `feishu_doc` 工具：

```
action: 'create'
title: '🔬 区块链研究周报 | {日期}'
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
SUMMARY_FILE="/tmp/blockchain-research-weekly-$(date +%Y%m%d).txt"
cat > "$SUMMARY_FILE" << 'EOFSUM'
🔬 研究报告：{总数}

📄 完整报告文档：
{从步骤1获取的飞书文档URL}

数据来源：{来源数}
EOFSUM
```

然后使用 `send_feishu_file_content` 工具：

```
filePath: 摘要文件路径
chatId: 'oc_53d1a541f08d2d9f2e8c3c79a1f12fc3'
title: '🔬 区块链研究周报'
maxLength: 1000
```

## ⚠️ 注意事项

1. 所有步骤必须成功完成
2. 使用标准Markdown格式（### 标题，不要用 • \*\* 等符号）
3. 确保文档中所有URL完整可点击
