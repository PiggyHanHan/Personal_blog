"use client";

import { useEffect, useState } from "react";

// ============================================================
// 提瓦特时钟（开幕大背景 · 左侧超大时钟）
// 当前是简单版：显示真实时间（时:分），金色圆环表盘。
// 后续可升级成原神样式的提瓦特时钟（刻度、元素纹饰等）。
// ============================================================

export default function TeyvatClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return (
    <div className="teyvat-clock" aria-hidden>
      <div className="teyvat-clock-face">
        <span className="teyvat-clock-time">
          {hh}:{mm}
        </span>
        <span className="teyvat-clock-label">提瓦特时间</span>
      </div>
    </div>
  );
}
