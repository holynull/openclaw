---
name: blockchain-security-daily
description: |
  🛡️ 区块链安全日报生成与发送

  自动监测区块链安全事件并生成日报，包含：
  - 🚨 高危事件（黑客攻击、协议漏洞）
  - ⚠️ 中危事件
  - 📋 审计发现
  - 🔐 安全建议

  数据源：7家权威安全机构RSS，优先使用 web_fetch
  输出格式：飞书文档 + 摘要消息
---

# 区块链安全日报生成 Skill

## 任务目标

生成区块链安全日报并发送到飞书群，监测最新安全事件、漏洞和攻击。

## 📰 数据源策略

### 优先方案：web_fetch（7个RSS源）

获取24小时内文章，包含关键词：hack/exploit/vulnerability/attack/security/breach/攻击/漏洞/安全

RSS源列表：

- https://blog.chainalysis.com/feed/
- https://www.elliptic.co/blog/rss.xml
- https://blog.trailofbits.com/feed/
- https://blog.sigmaprime.io/feeds/all.atom.xml
- https://cointelegraph.com/rss
- https://blockworks.co/feed/
- https://www.panewslab.com/zh/rss/newsflash.xml

### 降级方案：web_search

**触发条件**：仅当从RSS中提取的安全事件<3条时，才使用 `web_search` 补充（节省Brave用量）

搜索策略（每个关键词 count=5，freshness="day"）：

- "blockchain hack exploit" - 区块链黑客攻击
- "smart contract vulnerability" - 智能合约漏洞
- "crypto security breach" - 加密货币安全漏洞
- "DeFi protocol attack" - DeFi协议攻击
- "blockchain audit findings" - 区块链审计发现
- "cryptocurrency theft" - 加密货币盗窃

**质量要求**：

- 优先选择安全公司、审计机构、官方公告的内容
- 至少收集8条有效安全事件
- 每条包含：项目名、事件类型、影响范围、损失金额（如有）、来源链接

## 📝 报告格式（Feishu Markdown）

```markdown
# 🛡️ 区块链安全日报

{日期} | 数据来源：7家权威机构

---

## 📊 今日概览

✅ 行业平稳 / ⚠️ X起安全事件
💰 总损失金额：$XXX万（如有）

---

## 🚨 高危事件

### 项目名 - 事件标题

⏰ 发生时间  
💰 影响金额：$XXX万  
⚔️ 攻击手法：闪电贷/重入/权限漏洞等  
📊 当前状态：调查中/已追回/未追回  
🔗 [详情](url) | 来源：机构名

### 另一个事件标题

（同上格式）

---

## ⚠️ 中危事件

### 事件标题

（同上格式）

---

## 📋 审计发现

（智能合约审计发现的漏洞）

### 审计发现标题

内容描述  
🔗 [详情](url)

---

## 🔐 安全建议

• 风险提示内容
• 防护措施建议

---

📊 统计：本日X起事件 | 按严重程度排序
```

## 4️⃣ 保存并发送

### 步骤1：创建飞书文档

使用 `feishu_doc` 工具：

```
action: 'create'
title: '🛡️ 区块链安全日报 | {日期}'
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
SUMMARY_FILE="/tmp/blockchain-security-daily-report-$(date +%Y%m%d).txt"
cat > "$SUMMARY_FILE" << 'EOFSUM'
🛡️ 安全事件：{总数}

📄 完整报告文档：
{从步骤1获取的飞书文档URL}

数据来源：{来源数}
EOFSUM
```

然后使用 `send_feishu_file_content` 工具：

```
filePath: 摘要文件路径
chatId: 'oc_53d1a541f08d2d9f2e8c3c79a1f12fc3'
title: '🛡️ 区块链安全日报'
maxLength: 1000
```

## ⚠️ 注意事项

1. 所有步骤必须成功完成
2. 使用标准Markdown格式（### 标题，不要用 • \*\* 等符号）
3. 确保文档中所有URL完整可点击
