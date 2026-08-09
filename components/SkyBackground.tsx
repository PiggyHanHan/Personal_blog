"use client";

import { useEffect, useState } from "react";
import { getPeriod, type Period } from "@/lib/period";

// ============================================================
// 背景图 A：整个窗口最底层的天空背景（竖屏内容区两侧露出的部分）
// 按时间段自动切换，素材放 public/ 下：
//   bg-side-dawn.jpg / bg-side-day.jpg / bg-side-dusk.jpg / bg-side-night.jpg
// 没放图时显示深色渐变兜底。
// ============================================================

export default function SkyBackground() {
  const [period, setPeriod] = useState<Period | null>(null);

  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()));
  }, []);

  return (
    <div
      aria-hidden
      className={`page-bg${period ? ` page-bg--${period}` : ""}`}
    />
  );
}
