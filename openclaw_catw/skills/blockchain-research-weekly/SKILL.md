---
name: blockchain-research-weekly
description: "Generate weekly blockchain research report with VC insights, on-chain analytics, and funding updates"
metadata: { "openclaw": { "emoji": "🔬" } }
---

# 区块链研究周报生成 Skill

## 任务目标

生成区块链研究周报并发送到飞书群，汇总VC观点、链上数据、融资动态和深度研究。

## 📰 数据源策略（降级方案）

### 优先方案：web_fetch（免费）

使用 `web_fetch` 工具获取8个机构RSS，提取最近7天的内容

### 降级方案：web_search

**触发条件**：当从RSS中提取的研究内容<8条时，使用 `web_search` 补充

搜索策略（每个关键词 count=5，freshness="week"）：

- "blockchain venture capital funding" - 区块链融资动态
- "crypto VC investment thesis" - VC投资观点
- "on-chain analytics report" - 链上数据分析
- "blockchain research paper" - 区块链研究报告
- "crypto market analysis" - 加密市场分析
- "DeFi TVL trends" - DeFi锁仓趋势

**质量要求**：

- 优先选择知名VC机构、分析平台、研究机构的内容
- 至少收集12条有效研究/分析内容
- 每条包含：机构名、研究主题、核心观点、来源链接

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

使用 `write_file` 工具创建摘要文件 `/tmp/blockchain-research-weekly-summary.txt`，内容格式：

```
{对应的emoji} {报告类型}：{实际数量}

📄 完整报告文档：
{步骤1返回的实际飞书文档URL}

数据来源：{实际来源数}
```

然后使用 `send_feishu_file_content` 工具：

```
filePath: "/tmp/blockchain-research-weekly-summary.txt"
chatId: "ou_0fa58dc0ea9bebec570346e829677da7"
title: "🔬 区块链研究周报"
maxLength: 1000
```
