import { createOpenAI } from "@ai-sdk/openai";

/**
 * Vercel AI SDK Provider 配置
 *
 * 支持 OpenAI 官方 和 火山引擎（OpenAI 兼容）等。
 * 通过环境变量切换：
 *   OPENAI_API_KEY  — 必填
 *   OPENAI_BASE_URL — 可选，火山引擎填 https://ark.cn-beijing.volces.com/api/v3
 *   AI_MODEL_FAST    — 可选，默认 gpt-4o-mini
 *   AI_MODEL_SMART   — 可选，默认 gpt-4o
 */

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  compatibility: "strict",
});

// 模型名优先级：环境变量 > 默认值
// 火山引擎用户：在 .env.local 里设置 AI_MODEL_FAST=ep-xxxxx
const modelFast = process.env.AI_MODEL_FAST ?? "gpt-4o-mini";
const modelSmart = process.env.AI_MODEL_SMART ?? "gpt-4o";
const modelStructured = process.env.AI_MODEL_STRUCTURED ?? modelFast; // 默认复用 fast

export const models = {
  /** 主力：快速、便宜，适合客服和笔记总结 */
  fast: openai(modelFast),
  /** 推理：复杂问题、多步 Tool Calling */
  smart: openai(modelSmart),
  /** 结构化输出专用（需要模型支持 structured outputs） */
  structured: openai(modelStructured, { structuredOutputs: true }),
} as const;

export type ModelName = keyof typeof models;

export const FLOWNOTE_SYSTEM_PROMPT = `你是 FlowNote 的 AI 助手。你的能力：

1. **笔记辅助**：帮助用户组织思路、扩展段落、总结关键点
2. **财务解析**：从自然语言中提取记账信息（金额、分类、日期）
3. **财务分析**：查询统计数据，分析支出结构，给出省钱建议
4. **复盘报告**：根据笔记和财务数据，生成工作+财务总结

重要：当用户问财务相关问题时，必须调用 getFinancialStats 工具获取真实数据，不要凭空编造。

风格要求：
- 中文回复，简洁专业
- 引用真实数据，不自行编造数字
- 不确定时主动询问，不给模糊建议`;
