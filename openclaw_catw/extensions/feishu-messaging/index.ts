import { readFile } from "node:fs/promises";
import { Type } from "@sinclair/typebox";

/**
 * Get Feishu tenant access token
 */
async function getFeishuAccessToken(appId: string, appSecret: string): Promise<string> {
  const response = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    },
  );

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(`Failed to get access token: ${result.msg}`);
  }

  return result.tenant_access_token;
}

/**
 * Send message to Feishu user or chat
 */
async function sendFeishuMessage(
  accessToken: string,
  targetId: string,
  receiveIdType: string,
  messageText: string,
): Promise<string> {
  const url = `https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      receive_id: targetId,
      msg_type: "text",
      content: JSON.stringify({ text: messageText }),
    }),
  });

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(`Failed to send message: ${result.msg}`);
  }

  return result.data.message_id;
}

/**
 * Send interactive card message to Feishu user or chat
 */
async function sendFeishuCardMessage(
  accessToken: string,
  targetId: string,
  receiveIdType: string,
  title: string,
  content: string,
  details?: string,
  mentionUserId?: string,
): Promise<string> {
  const url = `https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`;

  // Build card elements
  const elements: any[] = [];

  // Add mention if needed
  if (mentionUserId) {
    if (mentionUserId === "all") {
      elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: `<at id=all></at>`,
        },
      });
    } else {
      elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: `<at id=${mentionUserId}></at>`,
        },
      });
    }
  }

  // Add main content
  elements.push({
    tag: "div",
    text: {
      tag: "lark_md",
      content: content,
    },
  });

  // Add details/context if provided
  if (details) {
    elements.push({
      tag: "hr",
    });
    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**上下文**\n${details}`,
      },
    });
  }

  const card = {
    config: {
      wide_screen_mode: true,
    },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: title,
      },
    },
    elements: elements,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      receive_id: targetId,
      msg_type: "interactive",
      content: JSON.stringify(card),
    }),
  });

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(`Failed to send card message: ${result.msg}`);
  }

  return result.data.message_id;
}

/**
 * Send Markdown message as interactive card to Feishu user or chat
 */
async function sendFeishuMarkdownMessage(
  accessToken: string,
  targetId: string,
  receiveIdType: string,
  title: string,
  markdownContent: string,
): Promise<string> {
  const url = `https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`;

  // Build card with markdown content
  const card = {
    config: {
      wide_screen_mode: true,
    },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: title,
      },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: markdownContent,
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      receive_id: targetId,
      msg_type: "interactive",
      content: JSON.stringify(card),
    }),
  });

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(`Failed to send markdown message: ${result.msg}`);
  }

  return result.data.message_id;
}

export default function (api: any) {
  // ==================== Feishu Messaging Tools ====================

  // Tool 1: Send Feishu Reminder
  api.registerTool({
    name: "send_feishu_reminder",
    description:
      "Send reminder message to Feishu user or group chat. Supports rich content with context/details and @mention for groups. Requires FEISHU_APP_ID and FEISHU_APP_SECRET environment variables.",
    parameters: Type.Object({
      targetId: Type.String({
        description: "Target ID: user open_id (ou_xxx) for DM, or chat_id (oc_xxx) for group",
      }),
      message: Type.String({
        description: "Reminder message content (main text)",
      }),
      details: Type.Optional(
        Type.String({
          description:
            "Optional: Additional context, referenced conversation, or detailed information. Will be displayed in a separate section below the main message.",
        }),
      ),
      mentionUserId: Type.Optional(
        Type.String({
          description:
            "Optional: User ID to mention (ou_xxx) or 'all' for @all. Only works in group chats.",
        }),
      ),
    }),
    async execute(_id: any, params: any) {
      try {
        const { targetId, message, details, mentionUserId } = params;

        // Get credentials from environment
        const appId = process.env.FEISHU_APP_ID;
        const appSecret = process.env.FEISHU_APP_SECRET;

        if (!appId || !appSecret) {
          return {
            success: false,
            error: "Missing FEISHU_APP_ID or FEISHU_APP_SECRET environment variables",
          };
        }

        // Determine target type
        let receiveIdType: string;
        let targetType: string;

        if (targetId.startsWith("ou_")) {
          receiveIdType = "open_id";
          targetType = "user";
          if (mentionUserId) {
            console.log("⚠️  Warning: @mention is not supported in DM, ignoring mentionUserId");
          }
        } else if (targetId.startsWith("oc_")) {
          receiveIdType = "chat_id";
          targetType = "group";
        } else {
          return {
            success: false,
            error: `Invalid target ID: ${targetId}. Must start with ou_ (user) or oc_ (chat)`,
          };
        }

        // Get access token
        const accessToken = await getFeishuAccessToken(appId, appSecret);

        let messageId: string;

        // If details are provided, send rich card message
        if (details) {
          messageId = await sendFeishuCardMessage(
            accessToken,
            targetId,
            receiveIdType,
            "⏰ 提醒", // Card title
            message,
            details,
            mentionUserId || undefined,
          );
        } else {
          // Build simple text message with @mention if needed
          let messageText = message;
          if (mentionUserId && targetType === "group") {
            // Feishu @mention format: <at user_id="xxx"></at>
            messageText = `<at user_id="${mentionUserId}"></at> ${message}`;
          }

          // Send simple text message
          messageId = await sendFeishuMessage(accessToken, targetId, receiveIdType, messageText);
        }

        return {
          success: true,
          targetId,
          targetType,
          messageId,
          hasDetails: !!details,
          message: `✅ Reminder sent successfully to ${targetType}${details ? " (with context)" : ""}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  });

  // Tool 2: Send File Content to Feishu
  api.registerTool({
    name: "send_feishu_file_content",
    description:
      "Send message to Feishu chat. Can send local file content, URL link, or direct text content. Supports both plain text and Markdown rendering. Useful for sending reports. Requires FEISHU_APP_ID and FEISHU_APP_SECRET environment variables.",
    parameters: Type.Object({
      filePath: Type.String({
        description:
          "File path, URL (https://...), or direct text content to send. If starts with https://, treated as URL link. Otherwise if file exists, reads file content. If file doesn't exist, sends as direct text.",
      }),
      chatId: Type.String({
        description: "Feishu chat ID (oc_xxx for group chat) or user ID (ou_xxx for private chat)",
      }),
      title: Type.Optional(
        Type.String({
          description: "Optional: Title/header for the message",
        }),
      ),
      useMarkdown: Type.Optional(
        Type.Boolean({
          description:
            "Optional: If true, renders content as Markdown in interactive card. If false, sends as plain text. Default: auto-detect based on content (checks for **, ##, [](url), etc.)",
          default: undefined,
        }),
      ),
      maxLength: Type.Optional(
        Type.Number({
          description:
            "Optional: Maximum characters to read from file (default: 10000 for markdown, 2800 for plain text)",
          default: undefined,
        }),
      ),
    }),
    async execute(_id: any, params: any) {
      try {
        const { filePath, chatId, title, useMarkdown, maxLength } = params;

        // Validate chat ID and determine receive type
        let receiveIdType: string;
        if (chatId.startsWith("oc_")) {
          receiveIdType = "chat_id";
        } else if (chatId.startsWith("ou_")) {
          receiveIdType = "open_id";
        } else {
          return {
            success: false,
            error: `Invalid chat ID: ${chatId}. Must start with oc_ (group chat) or ou_ (user)`,
          };
        }

        // Get credentials from environment
        const appId = process.env.FEISHU_APP_ID;
        const appSecret = process.env.FEISHU_APP_SECRET;

        if (!appId || !appSecret) {
          return {
            success: false,
            error: "Missing FEISHU_APP_ID or FEISHU_APP_SECRET environment variables",
          };
        }

        // Determine content type and get message content
        let fileContent: string;
        let contentType: string;

        if (filePath.startsWith("https://") || filePath.startsWith("http://")) {
          // URL link - send as clickable link
          contentType = "url";
          fileContent = filePath;
        } else {
          // Try to read as file, if fails treat as direct text
          try {
            const fullContent = await readFile(filePath, "utf-8");
            contentType = "file";
            // Limit content length
            const defaultMaxLength = useMarkdown !== false ? 10000 : 2800;
            const actualMaxLength = maxLength !== undefined ? maxLength : defaultMaxLength;
            fileContent = fullContent.slice(0, actualMaxLength);
            if (fullContent.length > actualMaxLength) {
              fileContent += `\n\n[Content truncated. Full length: ${fullContent.length} chars]`;
            }
          } catch (error: any) {
            // If file doesn't exist, treat as direct text content
            contentType = "text";
            const defaultMaxLength = useMarkdown !== false ? 10000 : 2800;
            const actualMaxLength = maxLength !== undefined ? maxLength : defaultMaxLength;
            fileContent = filePath.slice(0, actualMaxLength);
          }
        }

        // Auto-detect markdown if not explicitly specified
        let shouldUseMarkdown = useMarkdown;
        if (shouldUseMarkdown === undefined) {
          // Check for common markdown patterns
          const markdownPatterns = [
            /\*\*.+\*\*/, // **bold**
            /##+ /, // ## headers
            /^\* /m, // * bullet lists
            /^\d+\. /m, // 1. numbered lists
            /\[.+\]\(.+\)/, // [text](url) links
            /^> /m, // > blockquotes
          ];
          shouldUseMarkdown = markdownPatterns.some((pattern) => pattern.test(fileContent));
        }

        // Get access token
        const accessToken = await getFeishuAccessToken(appId, appSecret);

        let messageId: string;
        const messageTitle = title || (contentType === "url" ? "📄 文档链接" : `📊 Report`);

        if (shouldUseMarkdown) {
          // Send as Markdown card message
          const timestamp = new Date().toISOString().split("T")[0];
          const markdownContent =
            contentType === "url"
              ? `📅 ${timestamp}\n\n🔗 [${fileContent}](${fileContent})`
              : `📅 ${timestamp}\n\n${fileContent}`;

          messageId = await sendFeishuMarkdownMessage(
            accessToken,
            chatId,
            receiveIdType,
            messageTitle,
            markdownContent,
          );
        } else {
          // Send as plain text message
          const timestamp = new Date().toISOString().split("T")[0];
          const fullMessage =
            contentType === "url"
              ? `${messageTitle}\n📅 ${timestamp}\n\n🔗 ${fileContent}`
              : `${messageTitle}\n📅 ${timestamp}\n\n${fileContent}`;

          messageId = await sendFeishuMessage(accessToken, chatId, receiveIdType, fullMessage);
        }

        return {
          success: true,
          chatId,
          receiveIdType,
          messageId,
          contentType,
          messageFormat: shouldUseMarkdown ? "markdown" : "plain_text",
          filePath,
          contentLength: fileContent.length,
          message: `✅ ${contentType === "url" ? "Link" : "Content"} sent successfully to ${receiveIdType === "open_id" ? "user" : "chat"} (format: ${shouldUseMarkdown ? "markdown" : "plain text"})`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  });
}
