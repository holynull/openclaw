import { Type } from "@sinclair/typebox";

export default function (api: any) {
  console.log("[rss-fetch] Extension loaded, registering fetch_rss_news tool...");

  // RSS News Fetcher Tool
  api.registerTool(
    {
      name: "fetch_rss_news",
      description:
        "Fetch and parse RSS feeds. Returns structured data (title, description, link, pubDate) for the first N items from each source. Automatically truncates large XML to avoid token overflow. Use this instead of web_fetch for RSS URLs.",
      parameters: Type.Object({
        sources: Type.Array(Type.String(), {
          description: "Array of RSS feed URLs to fetch",
        }),
        maxItemsPerSource: Type.Optional(
          Type.Number({
            description: "Maximum number of items to extract from each source (default: 15)",
            default: 15,
          }),
        ),
      }),
      async execute(_id: any, params: any) {
        try {
          const { sources, maxItemsPerSource = 15 } = params;
          const allItems: any[] = [];

          for (const url of sources) {
            try {
              const response = await fetch(url);
              if (!response.ok) {
                console.warn(`Failed to fetch ${url}: ${response.statusText}`);
                continue;
              }

              const xmlText = await response.text();

              // Simple XML parsing for RSS items
              const itemMatches = xmlText.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
              let itemCount = 0;

              for (const match of itemMatches) {
                if (itemCount >= maxItemsPerSource) break;

                const itemXml = match[1];

                // Extract fields
                const titleMatch = itemXml.match(
                  /<title(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i,
                );
                const descMatch = itemXml.match(
                  /<description(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i,
                );
                const linkMatch = itemXml.match(/<link(?:[^>]*)>([\s\S]*?)<\/link>/i);
                const pubDateMatch = itemXml.match(/<pubDate(?:[^>]*)>([\s\S]*?)<\/pubDate>/i);

                const item = {
                  title: titleMatch ? titleMatch[1].trim() : "",
                  description: descMatch ? descMatch[1].trim().substring(0, 500) : "", // Limit description
                  link: linkMatch ? linkMatch[1].trim() : "",
                  pubDate: pubDateMatch ? pubDateMatch[1].trim() : "",
                  source: url,
                };

                if (item.title || item.link) {
                  allItems.push(item);
                  itemCount++;
                }
              }

              console.log(`[rss-fetch] Extracted ${itemCount} items from ${url}`);
            } catch (error: any) {
              console.error(`[rss-fetch] Error fetching ${url}:`, error.message);
            }
          }

          return {
            success: true,
            itemCount: allItems.length,
            items: allItems,
          };
        } catch (error: any) {
          console.error("[rss-fetch] Error in fetch_rss_news:", error);
          return {
            success: false,
            error: error.message,
          };
        }
      },
    },
    { optional: true },
  );

  console.log("[rss-fetch] fetch_rss_news tool registered successfully");
}
