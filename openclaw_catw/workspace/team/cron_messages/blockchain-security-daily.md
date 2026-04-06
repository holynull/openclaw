# 区块链安全日报生成任务

## 执行步骤

### 1. 收集安全新闻

- 调用fetch_rss_news工具（类似feishu_doc的调用方式）：
  - sources: ["https://blog.chainalysis.com/feed/", "https://www.elliptic.co/blog/rss.xml", "https://blog.trailofbits.com/feed/"]
  - maxItemsPerSource: 3

示例调用：

```
fetch_rss_news({
  sources: ["https://blog.chainalysis.com/feed/", "https://www.elliptic.co/blog/rss.xml"],
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
   - `**【${i+1}】${item.title}**` (粗体)
   - `${item.description}`
   - `[🔗 查看详情](${item.link})`
   - `⏰ ${item.pubDate}`
   - 空行
4. **禁止使用省略表达**：不允许出现"..."、"继续编号"、"扩展到"、"other X summarized"
5. **实际生成过程**：不要在脑海中计划，直接把每条都写出来

报告格式（lark_md支持的格式）：

```markdown
🛡️ **区块链安全日报**

日期：{日期}

━━━━━━━━━━━━━━━━━━━━

📋 **今日安全态势**

从 **{实际条数}** 条新闻中精选：

🚨 **重大安全事件**：{提取最严重的1-2个安全事件}
🔍 **漏洞发现**：{如有新漏洞发现，简要说明}
💡 **安全建议**：{重要的安全提示}
⚠️ **风险预警**：{需要注意的风险}

━━━━━━━━━━━━━━━━━━━━

🛡️ **今日详细安全事件（按时间倒序）**

**【1】{items[0].title}**

{items[0].description}

[🔗 查看详情]({items[0].link})

⏰ {items[0].pubDate}

**【2】{items[1].title}**

{items[1].description}

[🔗 查看详情]({items[1].link})

⏰ {items[1].pubDate}

（继续列出所有条目，格式同上）

━━━━━━━━━━━━━━━━━━━━

📊 **数据统计**

总条数：**{itemCount}**
数据源：**{sources数量}** 家
更新时间：{当前时间}
```

**关键要点：**

- 上面示例展示了格式，实际根据items.length全部列出
- lark_md 支持：**粗体**、[链接](url)、换行
- lark_md 不支持：## 标题、### 标题、列表、代码块

### 3. 发送Markdown报告（必须调用工具）

**必须立即调用send_feishu_file_content工具**，不要只说"准备发送"或"即将发送"！

参数：

- filePath: {步骤2生成的完整Markdown字符串}
- chatId: 'ou_0fa58dc0ea9bebec570346e829677da7'
- title: '🛡️ 区块链安全日报'
- **useMarkdown: true**

**关键：不要只输出Markdown，必须调用send_feishu_file_content工具！** （关键！启用Markdown渲染）

## ⚠️ 重要提示

- **优先使用fetch_rss_news工具**
- **必须设置 useMarkdown: true 参数**
- **必须执行完全部3个步骤才算完成**
- **所有新闻条目必须全部列出，不要省略**
