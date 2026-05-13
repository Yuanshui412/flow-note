import { streamText } from "ai";
import { z } from "zod";
import { models, FLOWNOTE_SYSTEM_PROMPT } from "@/lib/ai/provider";
import { getCurrentUserId } from "@/lib/api/auth";
import { executeSearchNotes, executeCreateTransaction, executeGetFinancialStats, executeListAllNotes, executeGetNoteContent, executeCreateNote } from "@/lib/ai/tools/execute";
import { withRateLimit } from "@/lib/ratelimit/with-ratelimit";
import { RateLimitPresets } from "@/lib/ratelimit";

const ChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  workspaceId: z.string().min(1),
  model: z.enum(["fast", "smart"]).optional().default("fast"),
});

/**
 * POST /api/ai/chat — 流式对话 + Tool Calling
 */
async function handler(req: Request) {
  const userId = await getCurrentUserId();

  const body = await req.json();
  const { messages, workspaceId, model } = ChatSchema.parse(body);

  const result = await streamText({
    model: models[model],
    system: FLOWNOTE_SYSTEM_PROMPT,
    messages,

    // ─── Tool Calling ───
    tools: {
      searchNotes: {
        description: "在用户笔记中按关键词搜索标题。返回匹配的笔记列表。",
        parameters: z.object({
          query: z.string().describe("搜索关键词"),
          limit: z.number().optional().default(20).describe("返回条数上限"),
        }),
        execute: async ({ query, limit }) => {
          return executeSearchNotes({ query, limit }, workspaceId);
        },
      },

      listAllNotes: {
        description:
          "列出用户所有笔记。当用户说「查看所有笔记」「总结笔记」「有哪些笔记」时调用。" +
          "返回笔记标题列表，后续可调用 getNoteContent 获取具体内容。",
        parameters: z.object({}),
        execute: async () => {
          return executeListAllNotes(workspaceId);
        },
      },

      getNoteContent: {
        description:
          "获取一篇笔记的完整内容。当用户想看具体笔记内容、总结某篇笔记、或根据笔记回答问题时调用。" +
          "需要先通过 listAllNotes 或 searchNotes 获取笔记 ID。",
        parameters: z.object({
          noteId: z.string().describe("笔记 ID"),
        }),
        execute: async ({ noteId }) => {
          return executeGetNoteContent({ noteId }, workspaceId);
        },
      },

      createTransaction: {
        description:
          "创建一条财务记录。当用户说「记一笔」「花了xxx」「收入xxx」时调用。" +
          "必须从用户的话中准确提取金额、类型、分类、日期。分类用中文名如「餐饮」「交通」「办公」。",
        parameters: z.object({
          amount: z.number().positive().describe("金额，正数"),
          type: z.enum(["INCOME", "EXPENSE"]).describe("INCOME=收入, EXPENSE=支出"),
          categoryName: z.string().describe("分类中文名，如「餐饮」「交通」"),
          date: z.string().describe("ISO 日期，如 2026-05-13。默认今天。"),
          description: z.string().optional().describe("简短描述，保留用户原文"),
          noteId: z.string().optional().describe("关联笔记ID"),
        }),
        execute: async (input) => {
          return executeCreateTransaction(input, workspaceId, userId);
        },
      },

      getFinancialStats: {
        description:
          "查询财务统计数据。当用户问「本月花了多少」「支出分析」「财务情况」「收支统计」时调用。" +
          "返回收入/支出总额、分类明细、交易笔数。",
        parameters: z.object({
          year: z.number().describe("年份，如 2026"),
          month: z.number().optional().describe("月份 1-12，不传则查整年"),
        }),
        execute: async (input) => {
          return executeGetFinancialStats(input, workspaceId);
        },
      },

      createNote: {
        description:
          "创建一篇新笔记。当用户说「把分析结果保存为笔记」「创建笔记记录」「帮我写一篇笔记」时调用。" +
          "content 使用 Markdown 格式。",
        parameters: z.object({
          title: z.string().describe("笔记标题"),
          content: z.string().describe("笔记正文，Markdown 格式。用 ## 开头做标题，- 开头做列表。"),
        }),
        execute: async (input) => {
          return executeCreateNote(input, workspaceId, userId);
        },
      },
    },

    maxSteps: 5, // 最多工具调用轮次
  });

  return result.toDataStreamResponse();
}

export const POST = withRateLimit(handler, RateLimitPresets.ai);
