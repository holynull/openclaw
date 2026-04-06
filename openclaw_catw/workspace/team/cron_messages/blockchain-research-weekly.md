# 区块链研究与投资周报生成任务

## 执行步骤

### 1. 收集新闻

- 调用fetch_rss_news工具（类似feishu_doc的调用方式）：
  - sources: ["https://blog.chainalysis.com/feed/", "https://multicoin.capital/rss.xml", "https://www.placeholder.vc/blog?format=RSS", "https://outlierventures.io/feed/", "https://www.lynalden.com/feed/"]
  - maxItemsPerSource: 2

示例调用：

```
fetch_rss_news({
  sources: ["https://blog.ethereum.org/feed.xml", "https://blog.chain.link/rss/"],
  maxItemsPerSource: 5
})
```

- 如果不可用，使用web_search代替
- **无论获取多少条都要继续生成报告，不要询问或等待**

### 2. 生成完整Markdown报告

**重要执行规则：**

1. **lark_md格式限制！** 只支持 **粗体**、[链接](url)，不支持 ## 标题
2. **使用for循环遍历items数组**：`for (let i = 0; i < items.length; i++)`
3. **每条新闻格式**：
   - `**【${i+1}】${item.title}**` (粗体，不用##)
   - `${item.description}`
   - `[🔗 查看详情](${item.link})`
   - `⏰ ${item.pubDate}`
   - 空行
4. **禁止使用省略表达**：不允许出现"..."、"继续编号"、"扩展到"、"other X summarized"
5. **实际生成过程**：不要在脑海中计划，直接把每条都写出来

报告格式（lark_md支持的格式，不支持## ### 标题）：

```markdown
� **区块链研究与投资周报**

日期：{日期}

━━━━━━━━━━━━━━━━━━━━

📋 **本周摘要**

从 **{实际条数}** 条研究中精选：

🔍 **研究洞察**：{提取1-2个重要研究观点}
💰 **投资分析**：{如有投资相关分析概括}
📊 **市场趋势**：{市场趋势关键信息}
🎯 **策略建议**：{如有策略建议标注}

━━━━━━━━━━━━━━━━━━━━

📊 **本周详细研究（按时间倒序）**

**【1】{items[0].title}**

{items[0].description}

[🔗 查看详情]({items[0].link})

⏰ {items[0].pubDate}

**【2】{items[1].title}**

{items[1].description}

[🔗 查看详情]({items[1].link})

⏰ {items[1].pubDate}

**【3】{items[2].title}**

{items[2].description}

[🔗 查看详情]({items[2].link})

⏰ {items[2].pubDate}

**【4】{items[3].title}**

{items[3].description}

[🔗 查看详情]({items[3].link})

⏰ {items[3].pubDate}

**【5】{items[4].title}**

{items[4].description}

[🔗 查看详情]({items[4].link})

⏰ {items[4].pubDate}

**【6】{items[5].title}**

{items[5].description}

[🔗 查看详情]({items[5].link})

⏰ {items[5].pubDate}

**【7】{items[6].title}**

{items[6].description}

[🔗 查看详情]({items[6].link})

⏰ {items[6].pubDate}

**【8】{items[7].title}**

{items[8].description}

[🔗 查看详情]({items[7].link})

⏰ {items[7].pubDate}

**【9】{items[8].title}**

{items[8].description}

[🔗 查看详情]({items[8].link})

⏰ {items[8].pubDate}

**【10】{items[9].title}**

{items[9].description}

[🔗 查看详情]({items[9].link})

⏰ {items[9].pubDate}

（如果items.length >= 11，继续列出11到items.length，使用同样格式）

━━━━━━━━━━━━━━━━━━━━

📊 **数据统计**

总条数：**{itemCount}**
数据源：**{sources数量}** 家
更新时间：{当前时间}
```

**关键要点：**

- 上面示例展示了10条格式，实际根据items.length全部列出
- lark_md 支持：**粗体**、[链接](url)、换行
- lark_md 不支持：## 标题、### 标题、列表、代码块
- 用 **【编号】标题** 和空行来组织结构

### 3. 发送Markdown报告

立即调用send_feishu_file_content工具，参数：

- filePath: {步骤2生成的完整Markdown字符串}（包含\*\*、##、[](url)等Markdown格式）
- chatId: 'oc_53d1a541f08d2d9f2e8c3c79a1f12fc3'
- title: '� 区块链研究与投资周报'
- **useMarkdown: true** （关键！启用Markdown渲染）

（filePath是Markdown文本内容本身，不是文件路径或URL）

## ⚠️ 重要提示

- **必须使用fetch_rss_news工具**（工具在服务端解析RSS，只返回结构化数据）
- **必须设置 useMarkdown: true 参数**（启用lark_md渲染）
- **必须执行完全部3个步骤才算完成**
- **步骤2生成的Markdown必须包含fetch_rss_news返回的所有新闻条目**
- **不要精选或筛选，把items数组里的每一条都按顺序编号列出**
