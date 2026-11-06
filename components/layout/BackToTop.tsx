"use client";

import { useEffect, useState } from "react";
import { THEME_ASSETS, WIDGETS } from "@/lib/site";

// ============================================================
// 返回顶部（计划 9.3）
//
// 长文读到底，一键回到开头看目录 / 换文章——手机上尤其需要。
//
// 位置：**右下角**。注意计划里写的"避开右下角的 SettingsButton"其实是记错了：
//   SettingsButton 是 left: 16px 的**左下角**（见 globals.css 的 .settings-wrap），
//   两边各占一个角，不冲突。
// 层级：z-index 900 —— 盖得住正文，但**低于**往生堂门扉（9000）与开屏（9999）：
//   那两处是全屏仪式，不该有个"返回顶部"浮在上面。
//
// 触发：滚动超过一屏才出现（计划原文）；出现/隐藏走 visibility + opacity，
//   隐藏时同时脱离 tab 顺序与读屏，不需要额外管 tabIndex。
// ============================================================

export default function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setShown(window.scrollY > window.innerHeight);
    };
    const onScroll = () => {
      // rAF 合帧：滚动事件一秒能来几十次，不必每次都 setState
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top${shown ? " back-to-top--on" : ""}`}
      aria-label={WIDGETS.backToTop}
      title={WIDGETS.backToTop}
      onClick={() => {
        // 尊重"减弱动态效果"：直接跳，不做平滑滚动
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      <span
        className="back-to-top__face"
        style={{ backgroundImage: `url("${THEME_ASSETS.hutaoFace}")` }}
        aria-hidden
      />
      {/* 小箭头徽章：光有一张脸看不出是"回到顶部" */}
      <span className="back-to-top__arrow" aria-hidden>
        <svg viewBox="0 0 24 24" width="13" height="13" focusable="false">
          <path
            fill="currentColor"
            d="M12 4.6l7.4 7.4-1.9 1.9-4.1-4.1V20h-2.8V9.8L6.5 13.9 4.6 12z"
          />
        </svg>
      </span>
    </button>
  );
}
