# 中文区块链日报生成任务（Markdown版）

## 执行步骤

### 1. 收集新闻

- 调用fetch_rss_news工具：
  - sources: ["https://www.chainfeeds.xyz/rss", "https://www.panewslab.com/zh/rss/foryou.xml", "https://www.panewslab.com/zh/rss/newsflash.xml"]
  - maxItemsPerSource: 5

### 2. 生成完整Markdown报告

**重要执行规则：**

1. **现在支持Markdown渲染！** 使用 **粗体**、## 标题、[链接文字](url) 等格式
2. **使用for循环遍历items数组**：`for (let i = 0; i < items.length; i++)`
3. **每条新闻必须包含**：
   - `## ${i+1}. ${item.title}` (二级标题)
   - `${item.description}`
   - `[🔗 查看详情](${item.link})`
   - `⏰ ${item.pubDate}`
   - 空行
4. **禁止使用省略表达**：不允许出现"..."、"继续编号"、"扩展到"、"other X summarized"
5. **实际生成过程**：不要在脑海中计划，直接把每条都写出来

报告格式（标准Markdown，会被飞书渲染）：

```markdown
## 📰 中文区块链日报

**日期**：{日期}

---

### 📋 今日摘要

从 **{实际条数}** 条新闻中精选：

- 🔥 **重大事件**：{提取1-2个最重要的事件标题}
- 💰 **融资动态**：{如有融资/项目相关新闻，简要概括}
- 📊 **市场动向**：{市场/技术相关的关键信息}
- ⚠️ **安全提示**：{如有安全事件，重点标注}

---

### 📰 今日详细新闻（按时间倒序）

## 1. {items[0].title}

{items[0].description}

[🔗 查看详情]({items[0].link})

⏰ {items[0].pubDate}

## 2. {items[1].title}

{items[1].description}

[🔗 查看详情]({items[1].link})

⏰ {items[1].pubDate}

## 3. {items[2].title}

{items[2].description}

[🔗 查看详情]({items[2].link})

⏰ {items[2].pubDate}

## 4. {items[3].title}

{items[3].description}

[🔗 查看详情]({items[3].link})

⏰ {items[3].pubDate}

## 5. {items[4].title}

{items[4].description}

[🔗 查看详情]({items[4].link})

⏰ {items[4].pubDate}

## 6. {items[5].title}

{items[5].description}

[🔗 查看详情]({items[5].link})

⏰ {items[5].pubDate}

## 7. {items[6].title}

{items[6].description}

[🔗 查看详情]({items[6].link})

⏰ {items[6].pubDate}

## 8. {items[7].title}

{items[7].description}

[🔗 查看详情]({items[7].link})

⏰ {items[7].pubDate}

## 9. {items[8].title}

{items[8].description}

[🔗 查看详情]({items[8].link})

⏰ {items[8].pubDate}

## 10. {items[9].title}

{items[9].description}

[🔗 查看详情]({items[9].link})

⏰ {items[9].pubDate}

（如果items.length >= 11，继续列出11到items.length，格式同上）

---

### 📊 数据统计

- 总条数：**{itemCount}**
- 数据源：**{sources数量}** 家
- 更新时间：{当前时间}
```

### 3. 发送Markdown报告

立即调用send_feishu_file_content工具，参数：

- filePath: {步骤2生成的完整Markdown字符串}（包含\*\*、##、[](url)等格式）
- chatId: 'ou_0fa58dc0ea9bebec570346e829677da7'
- title: '📰 中文区块链日报'
- **useMarkdown: true** （关键！启用Markdown渲染）

（filePath是Markdown文本内容本身，不是文件路径或URL）

## ⚠️ 重要提示

- **必须使用fetch_rss_news工具**
- **必须设置 useMarkdown: true 参数**
- **必须执行完全部3个步骤才算完成**
- **所有新闻条目必须全部列出，不要省略**
