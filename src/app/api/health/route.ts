import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/health — 健康检查
 *
 * K8s livenessProbe 和 readinessProbe 都指向这里。
 * 返回各组件状态，监控系统据此判断是否告警。
 */

interface ComponentStatus {
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  message?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;       // 进程已运行秒数
  timestamp: string;
  components: Record<string, ComponentStatus>;
}

const startTime = Date.now();

export async function GET() {
  const dbStatus = await checkDatabase();
  const aiStatus = checkAI();

  const components = { database: dbStatus, ai: aiStatus };

  const allOk = Object.values(components).every((c) => c.status === "ok");
  const allDown = Object.values(components).every((c) => c.status === "down");

  const response: HealthResponse = {
    status: allDown ? "unhealthy" : allOk ? "healthy" : "degraded",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    components,
  };

  const httpStatus = allDown ? 503 : allOk ? 200 : 200;

  return Response.json(response, { status: httpStatus });
}

async function checkDatabase(): Promise<ComponentStatus> {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - t0,
      message: String(err).slice(0, 200),
    };
  }
}

function checkAI(): ComponentStatus {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith("sk-REPLACE")) {
    return { status: "degraded", latencyMs: 0, message: "未配置 API Key" };
  }
  return { status: "ok", latencyMs: 0 };
}
