---
name: web3-developer-biweekly
description: |
  👨‍💻 Web3开发者双周报生成与发送

  汇总两周内Web3开发资源，包含：
  - 🔬 以太坊研究前沿（EIP提案、协议研究）
  - 🛠️ 开发工具 & SDK
  - 📚 技术教程 & 最佳实践
  - 🏗️ 架构 & 设计模式
  - 🌐 标准 & 协议

  数据源：8个RSS，优先web_fetch，不足时web_search降级
  输出格式：飞书文档 + 摘要消息
---

# Web3开发者双周报生成 Skill

## 任务目标

生成Web3开发者双周报并发送到飞书群，汇总最新开发工具、教程和技术讨论。

## 📰 数据源策略（降级方案）

### 优先方案：web_fetch（免费）

使用 `web_fetch` 工具获取8个开发者RSS，提取最近14天的内容

### 降级方案：web_search

**触发条件**：当从RSS中提取的开发资源<10条时，使用 `web_search` 补充

搜索策略（每个关键词 count=5，freshness="2week"）：

- "Ethereum EIP proposal" - EIP提案
- "web3 development tutorial" - Web3开发教程
- "smart contract best practices" - 智能合约最佳实践
- "Solidity security audit" - Solidity安全审计
- "blockchain SDK update" - 区块链SDK更新
- "ethers.js web3.js tutorial" - 开发库教程

**质量要求**：

- 优先选择官方文档、技术博客、知名开发者的内容
- 至少收集15条有效开发资源
- 每条包含：资源类型（工具/教程/提案）、标题、适用场景、来源链接

## 📝 报告格式（Feishu Markdown）

```markdown
# 👨‍💻 Web3开发者双周报

{日期范围}

---

## 📋 双周焦点

🔬 研究热点：XXX  
🛠️ 工具更新：X个  
📚 新教程：Y篇

---

## 🔬 以太坊研究前沿

### EIP提案 & 协议研究

#### 提案/讨论标题 - ethresear.ch

🏷️ 分类：共识机制/Layer2/ZK证明  
💡 核心内容：（技术要点）  
📊 讨论热度：X replies  
🔗 [查看讨论](url)

---

## 🛠️ 开发工具 & SDK

### 框架更新

#### 工具/库名 vX.X - 来源

⚙️ 新特性：  
• 功能1
• 功能2

💻 适用场景  
🔗 [文档](url)

### Python Web3 (web3.py)

#### 更新标题 - Snake Charmers

🐍 Python工具链更新  
📦 新功能/Bug修复  
🔗 [详情](url)

---

## 📚 技术教程 & 最佳实践

### 教程标题 - LogRocket

🎯 主题：智能合约/Dapp开发  
📖 内容概要：  
• 关键步骤
• 最佳实践

💡 适合人群：初级/中级/高级  
🔗 [阅读](url)

---

## 🏗️ 架构 & 设计模式

### 智能合约模式/Dapp架构

🏛️ 设计思路  
⚡ 性能优化  
🔐 安全考虑  
🔗 [详情](url)

---

## 🌐 标准 & 协议

### ERC标准 / 跨链协议

#### 标准提案 - Enterprise Ethereum Alliance

📋 标准内容  
🎯 应用场景  
🔗 [规范](url)

---

📊 本期统计：X个讨论 | Y篇教程 | Z个工具更新  
💡 开发者建议：（本期技术趋势总结）
```

## 4️⃣ 保存并发送

### 步骤1：创建飞书文档

使用 `feishu_doc` 工具：

```
action: 'create'
title: '👨‍💻 Web3开发者双周报 | {日期}'
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
SUMMARY_FILE="/tmp/web3-developer-biweekly-$(date +%Y%m%d).txt"
cat > "$SUMMARY_FILE" << 'EOFSUM'
👨‍💻 开发资源：{总数}

📄 完整报告文档：
{从步骤1获取的飞书文档URL}

数据来源：{来源数}
EOFSUM
```

然后使用 `send_feishu_file_content` 工具：

```
filePath: 摘要文件路径
chatId: 'oc_53d1a541f08d2d9f2e8c3c79a1f12fc3'
title: '👨‍💻 Web3开发者双周报'
maxLength: 1000
```

## ⚠️ 注意事项

1. 所有步骤必须成功完成
2. 使用标准Markdown格式（### 标题，不要用 • \*\* 等符号）
3. 确保文档中所有URL完整可点击
