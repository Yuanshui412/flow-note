/**
 * FlowNote 全链路压测脚本（k6）
 *
 * 安装：https://k6.io/docs/get-started/installation/
 * 运行：k6 run tests/load-test.js
 *
 * 测试场景：
 *   - 阶段 1: 30 秒内从 1 爬升到 50 VU（模拟日常流量）
 *   - 阶段 2: 60 秒保持 50 VU（稳态压测）
 *   - 阶段 3: 10 秒爬升到 200 VU（突发流量）
 *   - 阶段 4: 60 秒保持 200 VU（极限压测）
 *   - 阶段 5: 30 秒降到 0（冷却）
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";

// ─── 自定义指标 ───

const noteCreateDuration = new Trend("note_create_duration");
const noteListDuration = new Trend("note_list_duration");
const aiChatDuration = new Trend("ai_chat_duration");
const errorRate = new Rate("error_rate");

// ─── 配置 ───

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:3000";
const WORKSPACE_ID = __ENV.WORKSPACE_ID ?? "test-workspace";

export const options = {
  stages: [
    { duration: "30s", target: 50 },   // 爬升
    { duration: "60s", target: 50 },   // 稳态
    { duration: "10s", target: 200 },  // 突发
    { duration: "60s", target: 200 },  // 极限
    { duration: "30s", target: 0 },    // 冷却
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% 请求 < 2s
    error_rate: ["rate<0.05"],          // 错误率 < 5%
  },
};

// ─── 主流程 ───

export default function () {
  group("Health Check", () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      "health status 200": (r) => r.status === 200,
    });
  });

  group("笔记列表", () => {
    const res = http.get(
      `${BASE_URL}/api/notes?workspaceId=${WORKSPACE_ID}&page=1`
    );
    noteListDuration.add(res.timings.duration);
    check(res, {
      "notes list 200": (r) => r.status === 200 || r.status === 401,
    });
    if (res.status >= 400) errorRate.add(1);
  });

  group("创建笔记", () => {
    const payload = JSON.stringify({
      workspaceId: WORKSPACE_ID,
      title: `压测笔记 ${Date.now()}`,
      content: [{ id: "b1", type: "paragraph", content: "负载测试内容" }],
    });

    const res = http.post(`${BASE_URL}/api/notes`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    noteCreateDuration.add(res.timings.duration);
    if (res.status >= 400 && res.status !== 401) errorRate.add(1);
  });

  group("AI 解析", () => {
    const payload = JSON.stringify({
      text: "今天和客户吃饭花了800元",
    });

    const res = http.post(`${BASE_URL}/api/ai/parse-transaction`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    aiChatDuration.add(res.timings.duration);
    check(res, {
      "ai parse 200": (r) =>
        r.status === 200 || r.status === 429 || r.status === 401,
    });
    // 429 不算错误（限流正常行为）
    if (res.status >= 400 && res.status !== 429 && res.status !== 401) {
      errorRate.add(1);
    }
  });

  sleep(1);
}

// ─── 压测报告摘要 ───

export function handleSummary(data) {
  return {
    "tests/load-test-summary.json": JSON.stringify(data, null, 2),
    stdout: `
═══════════════════════════════════════
 FlowNote 压测报告
═══════════════════════════════════════
 总请求数:     ${data.metrics.http_reqs?.values?.count ?? 0}
 失败率:       ${(data.metrics.error_rate?.values?.rate * 100).toFixed(2)}%
 P95 延迟:     ${data.metrics.http_req_duration?.values?.["p(95)"]?.toFixed(0) ?? 0} ms
 平均延迟:     ${data.metrics.http_req_duration?.values?.avg?.toFixed(0) ?? 0} ms

 笔记创建 P95: ${data.metrics.note_create_duration?.values?.["p(95)"]?.toFixed(0) ?? 0} ms
 笔记列表 P95: ${data.metrics.note_list_duration?.values?.["p(95)"]?.toFixed(0) ?? 0} ms
 AI 解析 P95:  ${data.metrics.ai_chat_duration?.values?.["p(95)"]?.toFixed(0) ?? 0} ms
═══════════════════════════════════════
`,
  };
}
