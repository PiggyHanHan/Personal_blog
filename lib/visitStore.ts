"use client";

// ============================================================
// 访客统计的浏览器端共享状态（计划 3.1，按验收意见改了两处显示位置）
//
// 为什么要抽这一层：同一次访问要**在两个地方同时显示**同一组数字——
//   ① 开屏「往生堂 · 欢迎光临」下面那行（第一眼就能看到）
//   ② 左侧导航栏的「旅人簿」（读文章时一直看得到）
// 如果两处各发一次请求，PV 会被记两次、数字还可能不一致。
// 所以：**上报只发生一次**（VisitReporter 跟着路由变化走），两处显示都订阅同一份快照。
//
// 与 lib/reactionStore.ts 同一套路：模块级单例 + useSyncExternalStore，
// 快照对象只在数据变化时替换（getServerSnapshot 必须是模块级常量，否则 React 会判定每次都在变）。
//
// 2026-10-15（3.20 单篇阅读数）：`/api/stats` 的响应里本来就带 `posts`（每篇**公开**文章的
// 翻阅次数，服务端 `publicViewCounts()` 算好），但一直没人消费。这里顺手并进**同一份快照**，
// 于是阅读数和旅人簿共用那一次 `POST /api/stats`——**全站仍然只有一次 stats + 一次 like**，
// 绝不为一个数字再开第三个请求（计划 3.20 的第 ① 条）。
// ============================================================
import { useEffect, useSyncExternalStore } from "react";

export type VisitStats = {
  /** 今日：来访旅人（按天去重）与翻阅次数 */
  today: { visitors: number; views: number };
  /** 历史：来访旅人（按「访客·天」累计）与翻阅次数 */
  total: { visitors: number; views: number };
  isNewToday: boolean;
};

export type VisitSnapshot = {
  /** 已经拿到过服务端数据 */
  ready: boolean;
  /** 接口不可用 / 被限流（显示一句"暂不可用"，不显示假数字） */
  failed: boolean;
  stats: VisitStats | null;
  /**
   * 每篇**公开**文章的翻阅次数（slug → PV），来自 `/api/stats` 的 `posts` 字段。
   *
   * ⚠️ 口径：这是**翻阅次数（PV）**，同一个人多次打开会重复计数（同路径 10 秒内去重，
   * 见 lib/analytics.ts 的 isDuplicate），**不是"多少人看过"**；私有文章不在这个映射里。
   */
  posts: Record<string, number>;
};

const EMPTY: VisitSnapshot = { ready: false, failed: false, stats: null, posts: {} };

let snapshot: VisitSnapshot = EMPTY;
const listeners = new Set<() => void>();
/** 已经上报过的路径（同一次浏览里同一路径不重复上报） */
let reportedPath = "";
let inFlight = false;

function emit(next: VisitSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): VisitSnapshot {
  return snapshot;
}

export function getServerSnapshot(): VisitSnapshot {
  return EMPTY;
}

/** 上报一次页面浏览（每次路由变化调一次；失败允许下次路由重试） */
export function reportVisit(path: string): void {
  if (typeof window === "undefined") return;
  if (inFlight || path === reportedPath) return;
  inFlight = true;
  reportedPath = path;

  void (async () => {
    try {
      const res = await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        ok?: boolean;
        posts?: Record<string, unknown>;
      } & Partial<VisitStats>;
      if (!data?.ok) throw new Error("bad response");
      const group = (src?: { visitors?: number; views?: number }) => ({
        visitors: Number(src?.visitors ?? 0),
        views: Number(src?.views ?? 0),
      });
      // posts：slug → 翻阅次数。服务端只给公开文章；这里再挡一次脏数据（非有限数一律丢掉），
      // 免得 NaN 被渲染成"翻阅 NaN 次"。
      const posts: Record<string, number> = {};
      for (const [slug, value] of Object.entries(data.posts ?? {})) {
        const n = Number(value);
        if (Number.isFinite(n)) posts[slug] = n;
      }
      emit({
        ready: true,
        failed: false,
        stats: {
          today: group(data.today),
          total: group(data.total),
          isNewToday: Boolean(data.isNewToday),
        },
        posts,
      });
    } catch {
      // 统计坏掉绝不能影响阅读：允许下一次路由再试一次
      // （保留已有快照：上一次成功拿到的旅人簿 / 阅读数继续显示，只是下次路由重试）
      reportedPath = "";
      emit({ ...snapshot, failed: true });
    } finally {
      inFlight = false;
    }
  })();
}

/** 组件用的订阅钩子（不再发请求，只读共享快照） */
export function useVisitStats(): VisitSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * 单篇公开文章的翻阅次数（计划 3.20）。
 *
 * 返回 `number | null`：**null 表示"还没有 / 没有这个数"**（快照没回来、文章是私有的、
 * 或者这篇一次都没人翻开过），调用方据此**整块不渲染**——绝不显示 "0"
 * （显示 0 等于告诉访客"这篇没人看过"，还会让人以为数据坏了，见 3.20 的第 ③ 条）。
 */
export function usePostViewCount(slug: string): number | null {
  const { posts } = useVisitStats();
  const value = posts[slug];
  return typeof value === "number" && value > 0 ? value : null;
}

/** 数字千分位（只在客户端渲染，不会有 hydration 差异） */
export function formatCount(value: number | undefined): string {
  return Number.isFinite(value) ? Number(value).toLocaleString("zh-CN") : "—";
}

/** 供 VisitReporter 用：路由变化时触发上报（effect 里调用，避免渲染期副作用） */
export function useReportVisit(pathname: string | null): void {
  useEffect(() => {
    if (pathname) reportVisit(pathname);
  }, [pathname]);
}
