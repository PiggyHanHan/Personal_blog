"use client";

import { useState } from "react";
import { useIntroSounds } from "@/components/hooks/useIntroSounds";

// ============================================================
// 关于页 · 胡桃玩偶：复制自开屏第一屏的互动胡桃。
// 点击随机播一条录音（往录音目录丢 wav/mp3 自动进池），
// 并触发 Q 弹果冻动画；图片缺失时静默隐藏，不影响页面。
// ============================================================

const DOLL_SRC = "/hutao/使用中/小素材/第一屏胡桃.png";

export default function HutaoDoll() {
  const { playRandomVoice } = useIntroSounds();
  const [bouncing, setBouncing] = useState(false);
  const [broken, setBroken] = useState(false);

  const handleClick = () => {
    // 先重置再触发，保证连点也能重播 Q 弹动画
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));
    playRandomVoice();
  };

  if (broken) return null;

  return (
    <button
      type="button"
      className={`hutao-doll${bouncing ? " hutao-doll--bounce" : ""}`}
      onClick={handleClick}
      onAnimationEnd={() => setBouncing(false)}
      aria-label="点我说话"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DOLL_SRC}
        alt="Q版胡桃"
        draggable={false}
        onError={() => setBroken(true)}
      />
    </button>
  );
}
