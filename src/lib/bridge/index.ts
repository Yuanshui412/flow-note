/**
 * FlowNote JSBridge — Web ↔ Native 通信层
 *
 * 三种主流 JSBridge 实现方式：
 *
 * ① JavaScriptCore (iOS) / addJavascriptInterface (Android)
 *    Native 向 WebView 注入对象：window.NativeBridge.share(...)
 *    优点：同步调用，性能最好
 *    缺点：仅限自家 App，调试困难
 *
 * ② URL Scheme 拦截
 *    Web: window.location.href = "flownote://share?title=xxx"
 *    Native 拦截 URL 变化并解析
 *    优点：兼容所有 WebView
 *    缺点：单向（Native → Web 需要回调），URL 长度限制
 *
 * ③ postMessage（本项目采用）
 *    Web: window.postMessage({ action: "share", data: {...} }, "*")
 *    Native: window.addEventListener("message", ...)
 *    优点：双向、结构化、无长度限制
 *    缺点：同源策略需注意
 */

// ─── 类型定义 ───

/** Web → Native 的消息 */
interface BridgeRequest {
  id: string;          // 唯一请求 ID，用于匹配回调
  action: string;      // 动作名
  data?: unknown;      // 参数
}

/** Native → Web 的响应 */
interface BridgeResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ─── FlowNote 专用 Action ───

export const BridgeActions = {
  /** 分享笔记 */
  SHARE: "share",
  /** 拍照插入笔记 */
  CAPTURE_PHOTO: "capturePhoto",
  /** 获取当前位置 */
  GET_LOCATION: "getLocation",
  /** 触发原生推送通知 */
  PUSH_NOTIFICATION: "pushNotification",
  /** 打开外部链接（系统浏览器） */
  OPEN_EXTERNAL: "openExternal",
  /** 获取设备信息 */
  GET_DEVICE_INFO: "getDeviceInfo",
} as const;

// ─── Bridge 客户端 ───

type PendingRequest = {
  resolve: (data: unknown) => void;
  reject: (error: string) => void;
  timer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingRequest>();
const TIMEOUT_MS = 15_000;

/**
 * 调用 Native 能力
 *
 * 用法：
 *   const result = await callNative(BridgeActions.SHARE, {
 *     title: "客户拜访记录",
 *     url: "https://flownote.app/notes/123"
 *   });
 */
export function callNative(action: string, data?: unknown): Promise<unknown> {
  const id = `bridge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(`Bridge 调用超时: ${action}`);
    }, TIMEOUT_MS);

    pending.set(id, { resolve, reject, timer });

    const request: BridgeRequest = { id, action, data };

    // 优先使用 Native 注入的专用通道
    if (typeof window !== "undefined" && (window as any).NativeBridge) {
      (window as any).NativeBridge.postMessage(JSON.stringify(request));
    } else {
      window.postMessage(request, "*");
    }
  });
}

/**
 * Native 端调用此函数响应 Web 请求
 * （Native 开发者在收到 BridgeRequest 后，处理完毕调用此函数）
 */
export function resolveNative(id: string, data: unknown): void {
  const req = pending.get(id);
  if (!req) return;

  clearTimeout(req.timer);
  pending.delete(id);
  req.resolve(data);
}

export function rejectNative(id: string, error: string): void {
  const req = pending.get(id);
  if (!req) return;

  clearTimeout(req.timer);
  pending.delete(id);
  req.reject(error);
}

/**
 * 监听来自 Native 的主动推送（无需 Web 先请求）
 */
export function onNativeMessage(
  callback: (action: string, data: unknown) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.action) {
      callback(event.data.action, event.data.data);
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/**
 * 检测是否运行在 Native WebView 中
 */
export function isInNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).NativeBridge || navigator.userAgent.includes("FlowNoteApp");
}
