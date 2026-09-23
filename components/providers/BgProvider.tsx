"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// ============================================================
// 博客背景轮播状态（全局共享）
//
// 背景图的轮播逻辑集中在这里，通过 Context 广播给所有需要"当前背景图"的组件：
//   - BlogBackground  渲染轮播背景层
//   - IntroOverlay    白屏加载阶段用同一张当前图做虚化装饰（与博客背景保持同步）
//
// 轮播：洗牌 → 每 15s 切换一次，交叉淡入淡出（1.8s）。
// ============================================================

export interface BgState {
  images: string[]; // 完整图片列表
  order: number[]; // 洗牌后的播放顺序
  idx: number; // 当前完全显示的图（order 中的位置）
  fading: boolean; // 是否处于交叉过渡中
}

export const BgContext = createContext<BgState>({
  images: [],
  order: [],
  idx: 0,
  fading: false,
});

export const useBg = () => useContext(BgContext);

const INTERVAL_MS = 15000; // 每 15 秒切换一张
const FADE_MS = 1800; // 交叉淡入淡出时长

// 背景会话连续性：洗牌结果 + 当前索引存到 sessionStorage。
// layout 在每次客户端导航都会重新执行（getBgImages 返回新数组，触发洗牌 effect 重跑），
// 若不持久化，每次切页面都重新随机 → 换新图 → 重新下载 → 网卡时先黑屏。
const BG_STATE_KEY = "blog-bg-state";
type BgSavedState = { order: number[]; idx: number; count: number };

function loadBgState(count: number): BgSavedState | null {
  if (typeof window === "undefined") return null; // SSR 阶段不读
  try {
    const raw = sessionStorage.getItem(BG_STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as BgSavedState;
    if (!s || !Array.isArray(s.order) || s.count !== count) return null;
    if (s.order.length !== count) return null;
    const seen = new Set(s.order);
    if (seen.size !== count || s.order.some((n) => n < 0 || n >= count)) return null;
    if (typeof s.idx !== "number" || s.idx < 0 || s.idx >= count) return null;
    return s;
  } catch {
    return null;
  }
}

function saveBgState(order: number[], idx: number) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      BG_STATE_KEY,
      JSON.stringify({ order, idx, count: order.length } satisfies BgSavedState)
    );
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

export default function BgProvider({
  images,
  children,
}: {
  images: string[];
  children: ReactNode;
}) {
  const bgImages = images.length > 0 ? images : null;

  // 洗牌（客户端挂载后执行，避免服务端/客户端随机不一致导致水合失败）
  // 优先恢复会话内已保存的顺序，没有才重新随机——保证切页面/刷新后背景连续
  const [order, setOrder] = useState<number[]>(() =>
    bgImages ? bgImages.map((_, i) => i) : []
  );
  const [idx, setIdx] = useState(0); // 当前完全显示的图（order 中的位置）
  useEffect(() => {
    if (!bgImages) return;
    const saved = loadBgState(bgImages.length);
    if (saved) {
      setOrder(saved.order);
      setIdx(saved.idx);
      return;
    }
    const arr = bgImages.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr);
  }, [bgImages]);

  // 顺序 / 当前索引变化时存回 sessionStorage
  useEffect(() => {
    if (!bgImages || order.length === 0) return;
    saveBgState(order, idx);
  }, [order, idx, bgImages]);

  const [fading, setFading] = useState(false); // 是否处于交叉过渡中
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 预加载下一张，切换时不卡顿
  useEffect(() => {
    if (!bgImages || order.length === 0) return;
    const nextIdx = (idx + 1) % order.length;
    const img = new Image();
    img.src = bgImages[order[nextIdx]];
  }, [idx, order, bgImages]);

  // 轮播状态机：idle 等 15s → fading 过渡 1.8s → idx+1 回到 idle
  useEffect(() => {
    if (!bgImages || order.length === 0) return;
    if (fading) {
      timerRef.current = setTimeout(() => {
        setIdx((i) => (i + 1) % order.length);
        setFading(false);
      }, FADE_MS);
    } else {
      timerRef.current = setTimeout(() => setFading(true), INTERVAL_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fading, order, bgImages]);

  return (
    <BgContext.Provider value={{ images: bgImages ?? [], order, idx, fading }}>
      {children}
    </BgContext.Provider>
  );
}
