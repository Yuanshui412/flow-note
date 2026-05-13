import type { CoreTool } from "ai";
import { z } from "zod";

/**
 * AI Tool Calling 注册中心
 *
 * 所有 AI 可调用的工具集中管理。
 * Day 09 会加入：财务记账、知识库检索、预算查询
 */

// ─── 工具定义 ───

const searchNotesTool: CoreTool = {
  description: "在用户的所有笔记中搜索相关内容",
  parameters: z.object({
    query: z.string().describe("搜索关键词"),
    limit: z.number().optional().default(5).describe("返回条数"),
  }),
};

const getStatsTool: CoreTool = {
  description: "获取当前工作区的财务统计数据",
  parameters: z.object({
    year: z.number().describe("年份"),
    month: z.number().optional().describe("月份（1-12），不传则整年"),
  }),
};

// ─── 注册表 ───

export const toolRegistry = {
  searchNotes: searchNotesTool,
  getStats: getStatsTool,
} as const satisfies Record<string, CoreTool>;

export type ToolName = keyof typeof toolRegistry;

/**
 * 根据名称获取工具列表
 * 用于按需给不同场景加载不同工具集
 */
export function getTools(names: ToolName[]): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {};
  for (const name of names) {
    if (toolRegistry[name]) {
      tools[name] = toolRegistry[name];
    }
  }
  return tools;
}
