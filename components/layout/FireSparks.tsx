"use client";

import { useEffect, useRef } from "react";
import { THEME_ASSETS } from "@/lib/site";

// ============================================================
// 火元素点击粒子（计划 9.2）
//
// 点页面任意处，在指尖迸出几粒火花，几百毫秒后自己消散——很轻的主题彩蛋。
//
// 三条自我约束：
//   1. **不进 React 状态**：粒子是 document.createElement 出来的一次性节点，
//      点得再快也不会触发重渲染（阅读长文时最怕这种隐形开销）；
//   2. **prefers-reduced-motion 时直接不挂监听**（不是"动画时长为 0"）；
//   3. 全屏仪式（开屏 / 往生堂门扉）与输入框上不冒火花——那几处不该被打扰。
//
// 2026-10-11 验收意见 4：既然仓库里有火元素图样，就别用 CSS 画的圆点了。
//   所以粒子改用 THEME_ASSETS.fire（真身是 942×942 的 PNG，装成 .jpeg 的那张），
//   做成 webp 放进 public/theme/（原目录不进部署包，见 §0.4）。
//   ⚠️ 与 FireVision 一样：**只位移、不旋转**，纹样始终正着。
// ============================================================

/** 每次点击迸出的粒数 */
const SPARKS_PER_CLICK = 6;
/** 粒子存活基准时长（实际会随机浮动，并加上每粒的延迟） */
const SPARK_LIFE_MS = 620;
/** 粒子基准尺寸（火元素纹样比原来的圆点"显小"，所以给大一点） */
const SPARK_SIZE_MIN = 13;
const SPARK_SIZE_MAX = 22;

export default function FireSparks() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onPointerDown = (event: PointerEvent) => {
      // 只认左键 / 单指，右键菜单、双指缩放不掺和
      if (event.button !== 0) return;

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".intro-overlay:not(.intro-overlay--done)")) return;
      if (target?.closest(".post-gate__overlay")) return;
      if (target?.closest(".settings-wrap")) return;
      if (target?.closest("input, textarea, select")) return;

      const { clientX: x, clientY: y } = event;
      for (let i = 0; i < SPARKS_PER_CLICK; i += 1) {
        const spark = document.createElement("span");
        spark.className = "spark";
        spark.style.left = `${x.toFixed(1)}px`;
        spark.style.top = `${y.toFixed(1)}px`;
        // 火元素图样素材（路径在 lib/site.ts 里单点维护）
        spark.style.backgroundImage = `url("${THEME_ASSETS.fire}")`;
        // 以"向上飘"为主：-90° 上下各散 75°，像火苗而不是烟花
        const angle = ((-90 + (Math.random() - 0.5) * 150) * Math.PI) / 180;
        const distance = 20 + Math.random() * 40;
        const life = Math.round(SPARK_LIFE_MS + Math.random() * 200);
        const size = SPARK_SIZE_MIN + Math.random() * (SPARK_SIZE_MAX - SPARK_SIZE_MIN);
        spark.style.setProperty("--dx", `${(Math.cos(angle) * distance).toFixed(1)}px`);
        spark.style.setProperty("--dy", `${(Math.sin(angle) * distance).toFixed(1)}px`);
        spark.style.setProperty("--size", `${size.toFixed(1)}px`);
        spark.style.setProperty("--life", `${life}ms`);
        spark.style.animationDelay = `${Math.round(i * 12 + Math.random() * 30)}ms`;
        host.appendChild(spark);
        // 动画跑完就摘掉节点，别让 DOM 越积越多
        window.setTimeout(() => spark.remove(), life + 300);
      }
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // 纯视觉层：pointer-events: none，绝不拦截任何点击
  return <div ref={hostRef} className="spark-layer" aria-hidden />;
}
