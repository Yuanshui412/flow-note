import { generateObject } from "ai";
import { z } from "zod";
import { models } from "@/lib/ai/provider";
import { getCurrentUserId } from "@/lib/api/auth";

const InputSchema = z.object({
  text: z.string().min(1, "请输入要解析的文本"),
});

/**
 * 财务解析的输出结构 —— 严格 Zod Schema
 * generateObject 保证 AI 输出 100% 符合此结构
 */
const TransactionOutputSchema = z.object({
  found: z.boolean().describe("是否检测到记账意图"),
  amount: z.number().optional().describe("金额，数字"),
  type: z.enum(["INCOME", "EXPENSE"]).optional().describe("收入还是支出"),
  category: z.string().optional().describe("分类名：餐饮/交通/办公/差旅/购物/工资/其他收入"),
  date: z.string().optional().describe("ISO 日期，如果文本未提及则用今天"),
  description: z.string().optional().describe("简短描述，尽量保留用户原文"),
  confidence: z.number().min(0).max(1).describe("置信度 0-1"),
  reasoning: z.string().optional().describe("解析推理过程，简要说明为什么这样判断"),
});

/**
 * POST /api/ai/parse-transaction — 自然语言 → 结构化账单
 *
 * 与 Tool Calling 的区别：
 * - Tool Calling: AI 在对话中自主决定要不要调工具（自由度高）
 * - generateObject:  强制输出结构化 JSON（可靠性高，适合快捷记账）
 */
export async function POST(req: Request) {
  await getCurrentUserId();

  const { text } = InputSchema.parse(await req.json());

  const result = await generateObject({
    model: models.structured,
    schema: TransactionOutputSchema,
    system:
      "你是一个财务数据提取器。从用户输入中提取记账信息。" +
      "金额用数字，分类用中文名。如果不确定，confidence 设低。" +
      "如果文本没有记账意图（比如只是聊天），found 设为 false。",
    prompt: `分析这段文本，提取记账信息：\n\n"${text}"\n\n当前日期：${new Date().toISOString().split("T")[0]}`,
  });

  return Response.json({
    success: true,
    data: result.object,
  });
}
