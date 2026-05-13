/**
 * FlowNote 种子脚本
 * 运行：npm run db:seed
 *
 * 预置数据：Demo 用户 + 工作区 + 7 个系统财务分类 + 示例笔记 + 预算
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("FlowNote 种子数据填充...\n");

  // ─── 1. Demo 用户 ───
  const user = await prisma.user.upsert({
    where: { email: "demo@flownote.ai" },
    update: {},
    create: {
      email: "demo@flownote.ai",
      name: "Demo User",
      passwordHash: "__demo__",
    },
  });
  console.log(`  [user] ${user.name} <${user.email}>`);

  // ─── 2. 工作区 ───
  const workspace = await prisma.workspace.upsert({
    where: { slug: "my-space" },
    update: {},
    create: { name: "我的工作区", slug: "my-space" },
  });
  console.log(`  [workspace] ${workspace.name} (${workspace.slug})`);

  // ─── 3. 成员关系 ───
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
  });
  console.log("  [member] OWNER");

  // ─── 4. 预置财务分类 ───
  const categories = [
    { name: "餐饮", icon: "🍜", type: "EXPENSE" as const, color: "#ef4444", sortOrder: 1, isSystem: true },
    { name: "交通", icon: "🚗", type: "EXPENSE" as const, color: "#f97316", sortOrder: 2, isSystem: true },
    { name: "办公", icon: "💻", type: "EXPENSE" as const, color: "#8b5cf6", sortOrder: 3, isSystem: true },
    { name: "差旅", icon: "✈️", type: "EXPENSE" as const, color: "#06b6d4", sortOrder: 4, isSystem: true },
    { name: "购物", icon: "🛒", type: "EXPENSE" as const, color: "#ec4899", sortOrder: 5, isSystem: true },
    { name: "其他", icon: "📌", type: "EXPENSE" as const, color: "#6b7280", sortOrder: 6, isSystem: true },
    { name: "工资", icon: "💵", type: "INCOME" as const, color: "#22c55e", sortOrder: 7, isSystem: true },
    { name: "其他收入", icon: "📦", type: "INCOME" as const, color: "#a3e635", sortOrder: 7, isSystem: true },
  ];

  for (const cat of categories) {
    await prisma.transactionCategory.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: cat.name } },
      update: {},
      create: { ...cat, workspaceId: workspace.id },
    });
  }
  console.log(`  [categories] ${categories.length} 个预置分类`);

  // ─── 5. 示例笔记（content 存为 JSON 字符串）───
  const sampleContent = JSON.stringify([
    { id: "b1", type: "heading", content: "客户拜访记录" },
    { id: "b2", type: "paragraph", content: "今天去拜访了杭州的王总，聊了新产品的合作方案。" },
    { id: "b3", type: "heading", content: "开销记录" },
    { id: "b4", type: "paragraph", content: "高铁往返票价 680 元。中午和客户在西湖边吃饭花了 800 元。" },
    { id: "b5", type: "paragraph", content: "下午买了伴手礼 200 元。晚上打车回家 65 元。" },
    { id: "b6", type: "heading", content: "后续跟进" },
    { id: "b7", type: "paragraph", content: "1. 下周三之前发送合同草案给王总\n2. 技术方案需要李明这边评估一下" },
  ]);

  const sampleNote = await prisma.note.upsert({
    where: { id: "note-demo-001" },
    update: {},
    create: {
      id: "note-demo-001",
      workspaceId: workspace.id,
      authorId: user.id,
      title: "3月客户拜访日志",
      content: sampleContent,
    },
  });
  console.log(`  [note] "${sampleNote.title}"`);

  // ─── 6. 示例预算（3月） ───
  const budgetStart = new Date("2026-03-01");
  const budgetEnd = new Date("2026-03-31");

  const lunchCat = await prisma.transactionCategory.findFirstOrThrow({
    where: { workspaceId: workspace.id, name: "餐饮" },
  });

  await prisma.budget.upsert({
    where: { id: "budget-demo-001" },
    update: {},
    create: {
      id: "budget-demo-001",
      workspaceId: workspace.id,
      categoryId: lunchCat.id,
      amount: 3000,
      periodStart: budgetStart,
      periodEnd: budgetEnd,
      note: "3月餐饮预算",
    },
  });
  console.log(`  [budget] 餐饮 ¥3000 (${budgetStart.toLocaleDateString("zh-CN")} → ${budgetEnd.toLocaleDateString("zh-CN")})`);

  console.log("\n种子数据填充完成");
}

main()
  .catch((e) => {
    console.error("种子数据填充失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
