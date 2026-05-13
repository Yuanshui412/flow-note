import { z } from "zod";
import { createRoute, HttpError } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

const RegisterSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  name: z.string().min(1, "姓名不能为空"),
  password: z.string().min(6, "密码至少6位"),
});

// 预置财务分类
const DEFAULT_CATEGORIES = [
  { name: "餐饮", icon: "🍜", type: "EXPENSE", color: "#ef4444", sortOrder: 1, isSystem: true },
  { name: "交通", icon: "🚗", type: "EXPENSE", color: "#f97316", sortOrder: 2, isSystem: true },
  { name: "办公", icon: "💻", type: "EXPENSE", color: "#8b5cf6", sortOrder: 3, isSystem: true },
  { name: "差旅", icon: "✈️", type: "EXPENSE", color: "#06b6d4", sortOrder: 4, isSystem: true },
  { name: "购物", icon: "🛒", type: "EXPENSE", color: "#ec4899", sortOrder: 5, isSystem: true },
  { name: "其他", icon: "📌", type: "EXPENSE", color: "#6b7280", sortOrder: 6, isSystem: true },
  { name: "工资", icon: "💵", type: "INCOME", color: "#22c55e", sortOrder: 7, isSystem: true },
  { name: "其他收入", icon: "📦", type: "INCOME", color: "#a3e635", sortOrder: 7, isSystem: true },
];

export const POST = createRoute({
  schema: RegisterSchema,
  async handler({ input }) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new HttpError(409, "EMAIL_EXISTS", "该邮箱已注册");
    }

    const passwordHash = await hashPassword(input.password);

    // 事务：创建用户 + 工作区 + 成员关系 + 预置分类
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      });

      // 为每个用户创建默认 workspace
      const slug = `user-${u.id.slice(0, 8)}`;
      const ws = await tx.workspace.create({
        data: {
          name: `${input.name}的工作区`,
          slug,
        },
      });

      // 加入为 OWNER
      await tx.workspaceMember.create({
        data: {
          userId: u.id,
          workspaceId: ws.id,
          role: "OWNER",
        },
      });

      // 预置分类
      for (const cat of DEFAULT_CATEGORIES) {
        await tx.transactionCategory.create({
          data: { ...cat, workspaceId: ws.id },
        });
      }

      return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
    });

    return user;
  },
});
