---
name: chinese-blockchain-daily
description: "Generate Chinese blockchain daily report. Use when asked to create blockchain news summary, crypto daily report, 区块链日报, or blockchain updates. Collects news from RSS/search, creates Feishu document, sends to specified user."
metadata: { "openclaw": { "emoji": "📰" } }
---

# 中文区块链日报生成 Skill

## 执行流程（3步）

### 步骤1：收集新闻（RSS优先）

- 用web_fetch获取RSS（chainfeeds.xyz, panewslab 2个源）
- **立即从结果中提取15-20条新闻**（标题、简述、URL），**丢弃原始XML**
- 如果不足15条，补充web_search

### 步骤2：创建并写入飞书文档

- feishu_doc create → 获得document_id
- feishu_doc write → 写入Markdown报告（分类：🔥重大、💰融资、📊市场）

### 步骤3：发送消息

- 调用send_feishu_file_content
- chatId: ou_0fa58dc0ea9bebec570346e829677da7
- 内容：飞书文档URL摘要

---

## RSS数据源（优先）

- https://www.chainfeeds.xyz/rss
- https://www.panewslab.com/zh/rss/foryou.xml
- https://www.panewslab.com/zh/rss/newsflash.xml

## 搜索关键词（降级）

web_search freshness="day"：

- "区块链" (count=10)
- "加密货币 融资" (count=5)
- "比特币 以太坊" (count=5)
- "Web3 项目" (count=5)
- "NFT DeFi" (count=5)

## 飞书文档格式

```markdown
# 📰 中文区块链日报 | {日期}

## 🔥 重大事件

### 标题

📄 简述（30-50字）  
🔗 [查看详情](URL)

## 💰 融资与项目

### 项目名 - 融资金额

📄 简述  
🔗 [详情](URL)

## 📊 市场与技术

### 标题

📄 简述  
🔗 [来源](URL)

---

**📊 今日统计**：共X条 | 数据源：Y家
```

## 工具调用顺序

1. feishu_doc create → 获得document_id和url
2. feishu_doc write → 写入content到document_id
3. send_feishu_file_content → 发送文档url摘要到ou_0fa58dc0ea9bebec570346e829677da7
