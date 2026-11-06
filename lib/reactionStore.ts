"use client";

// ============================================================
// 互动的浏览器端共享状态（计划 3.4 / 3.5 / 3.6）
//
// 为什么要有这一层：
//   文章列表页是**静态渲染**（§0.1 第 1 条），卡片上不可能有真实数字；
//   而如果每张卡片各自 fetch 一次，一页 10 篇就是 10 个请求。
//   所以：**全站一次 GET /api/like**，结果放在模块级单例里，所有卡片 / 详情页共用同一份快照。
//   模块级状态在 SPA 导航之间不会丢，切页面不会重复拉取。
//
// 用 useSyncExternalStore 而不是 Context：卡片散落在服务端组件树里
// （QuestCard 既在页面组件里渲染、也在客户端搜索结果里渲染），
// 用订阅式外部状态最省事，也不用给每个页面套 Provider。
// ============================================================
import { useEffect, useSyncExternalStore } from "react";

export type ReactionCounts = Record<string, Partial<Record<string, number>>>;

export type ReactionSnapshot = {
  /** 是否已经从服务端拿到过数据（SSR 与首次渲染都是 false） */
  ready: boolean;
  /** slug → kind → 计数 */
  counts: ReactionCounts;
  /** 这位访客自己点过的，形如 "slug|kind" */
  mine: ReadonlySet<string>;
};

/** 服务端 / 首次渲染的快照：必须是**模块级常量**，否则 useSyncExternalStore 会判定"每次都在变" */
const EMPTY: ReactionSnapshot = { ready: false, counts: {}, mine: new Set() };

let snapshot: ReactionSnapshot = EMPTY;
const listeners = new Set<() => void>();
let started = false;
/** 正在提交中的 key（"slug|kind"）：挡住连点造成的来回抖动 */
const pending = new Set<string>();

function emit(next: ReactionSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): ReactionSnapshot {
  return snapshot;
}

export function getServerSnapshot(): ReactionSnapshot {
  return EMPTY;
}

/** 拉一次全量计数（幂等；失败后允许下次导航重试） */
export function ensureLoaded(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  void (async () => {
    try {
      const res = await fetch("/api/like", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        counts?: ReactionCounts;
        mine?: string[];
      };
      if (!data?.ok) throw new Error(data?.error ?? "bad response");
      emit({
        ready: true,
        counts: data.counts ?? {},
        mine: new Set(data.mine ?? []),
      });
    } catch {
      // 互动接口不可用时页面照常可读：卡片不显示数字，按钮点了也不报错
      started = false;
    }
  })();
}

/** 切换一个表情：先乐观更新，再用服务端的权威计数覆盖；失败则整体回滚 */
export async function toggleReaction(slug: string, kind: string): Promise<void> {
  const key = `${slug}|${kind}`;
  if (pending.has(key)) return;
  const before = snapshot;
  const had = before.mine.has(key);
  const current = before.counts[slug]?.[kind] ?? 0;

  const optimisticMine = new Set(before.mine);
  if (had) optimisticMine.delete(key);
  else optimisticMine.add(key);
  emit({
    ready: true,
    counts: {
      ...before.counts,
      [slug]: {
        ...before.counts[slug],
        [kind]: Math.max(0, current + (had ? -1 : 1)),
      },
    },
    mine: optimisticMine,
  });

  pending.add(key);
  try {
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      counts?: Partial<Record<string, number>>;
      mine?: string[];
    };
    if (!data?.ok) throw new Error(data?.error ?? "bad response");

    // 只覆盖这一篇：其它篇的计数保持不动
    const mine = new Set(snapshot.mine);
    for (const entry of [...mine]) {
      if (entry.startsWith(`${slug}|`)) mine.delete(entry);
    }
    for (const entry of data.mine ?? []) mine.add(entry);
    emit({
      ready: true,
      counts: { ...snapshot.counts, [slug]: data.counts ?? {} },
      mine,
    });
  } catch {
    emit(before);
  } finally {
    pending.delete(key);
  }
}

/** 组件用的订阅钩子（挂载时自动触发一次全量加载） */
export function useReactions(): ReactionSnapshot {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    ensureLoaded();
  }, []);
  return snap;
}
