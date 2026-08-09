"use client";

import { useRef, useState } from "react";

// ============================================================
// 派蒙（开幕大背景 · 右侧可爱小精灵）
// 点击有反馈：弹跳 + 气泡说话。
// 图片占位说明：把派蒙图放到 public/paimon.png（支持 .png/.jpg/.webp），
// 并把下方 <img> 的 src 从占位改为 "/paimon.png"；目前先显示占位表情。
// ============================================================

const PAIMON_LINES = [
  "嘿！旅行者，该出发啦！",
  "开饭时间到！",
  "前面的区域，以后再来探索吧！",
  "应急食品什么的，太过分了！",
];

export default function Paimon() {
  const [bounceKey, setBounceKey] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 不要触发开幕的"点击任意位置进入"
    setBounceKey((k) => k + 1);
    setLine(PAIMON_LINES[Math.floor(Math.random() * PAIMON_LINES.length)]);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLine(null), 2600);
  };

  return (
    <div className="paimon" onClick={handleClick} role="button" tabIndex={0} aria-label="派蒙">
      <div className={`paimon-bubble${line ? " show" : ""}`}>{line ?? "点我一下"}</div>
      <div key={bounceKey} className="paimon-img-wrap paimon-bounce">
        {/* 占位表情；换成你自己的派蒙图时把 src 改为 "/paimon.png" */}
        <span className="paimon-placeholder">🧚</span>
      </div>
    </div>
  );
}
