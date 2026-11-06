"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WIDGETS } from "@/lib/site";
import { playVoice, preloadVoices } from "@/lib/voicePlayer";
import ElementIcon from "@/components/ui/ElementIcon";

// ============================================================
// 侧边栏那枚可点的神之眼（计划 9.1 的"点神之眼"那一半）
//
// 行为与开屏那张 Q 版胡桃一致，但**换一个池子**（vision）：点一下随机应一声。
//   · 池子内容 = public/theme/voice/vision/（往目录里丢音频就进池子，见 /api/voices）
//   · 与点胡桃共用 lib/voicePlayer.ts 的单例 → 互相打断、不叠音
//   · 浏览器自动播放策略：只有用户点击才出声（这里天然满足）
//   · 设置里关掉「胡桃语音」后：**按钮照常有 Q 弹反馈，只是不出声**（不作无声的假交互）
// ============================================================
export default function SidebarVision() {
  const [bounce, setBounce] = useState(false);
  const timerRef = useRef<number | null>(null);

  // 挂载即预加载池子：第一次点下去就能出声（不然要等枚举完才响）
  useEffect(() => {
    void preloadVoices("vision");
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    // 先重置再触发，保证连点也能重播同一个 Q 弹动画
    setBounce(false);
    requestAnimationFrame(() => setBounce(true));
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBounce(false), 600);
    playVoice("vision");
  }, []);

  return (
    <span className="sidebar__vision-wrap">
      <button
        type="button"
        className={`sidebar__vision-btn${bounce ? " sidebar__vision-btn--bounce" : ""}`}
        onClick={handleClick}
        aria-label={WIDGETS.visionLabel}
        title={WIDGETS.visionLabel}
      >
        <ElementIcon className="sidebar__vision" />
      </button>
      <span className="sidebar__vision-hint">{WIDGETS.visionHint}</span>
    </span>
  );
}
