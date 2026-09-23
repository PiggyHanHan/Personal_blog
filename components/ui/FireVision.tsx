"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { THEME_ASSETS } from "@/lib/site";

// ============================================================
// 火系神之眼单元：神之眼本体 + 脉动光晕（+ 点亮后的火元素外溢粒子）
//
// 从开屏组件 IntroOverlay 里抽出来共用：开屏进度条两侧、私有文章门扉的叩门按钮、
// 收窗帘的收拢边，用的都是这一个组件。
//
// 样式类沿用 globals.css 里的 .intro-vision*（历史命名）：改那组样式会同时影响
// 开屏与门扉，动之前先搜一遍引用。
//
//   full=false  常态：光晕缓慢脉动
//   full=true   点亮：光晕定格到最大，火元素粒子从宝石中心向随机方向陆续外溢
// ============================================================
export default function FireVision({
  full = false,
  mirror = false,
  fireBroken = false,
  className = "",
}: {
  /** 点亮态（口令正确 / 进度满） */
  full?: boolean;
  /** 水平镜像（开屏进度条右侧那枚） */
  mirror?: boolean;
  /** 火元素图样素材缺失：只显示神之眼，不画粒子 */
  fireBroken?: boolean;
  /** 额外类名（尺寸等由外部覆盖） */
  className?: string;
}) {
  // 每次随机一组粒子：随机角度 + 随机距离（50~80px），delay 均匀错开形成陆续感
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        angle: Math.floor(Math.random() * 360),
        dist: 50 + Math.floor(Math.random() * 30),
        delay: (i / 6) * 2 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <span
      className={`intro-vision-wrap${mirror ? " intro-vision-wrap--mirror" : ""}${
        full ? " intro-vision-wrap--full" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <span className="intro-vision-glow" aria-hidden />
      {/* 火元素纹样：点亮后才出现，多枚粒子从宝石中心向随机方向陆续外溢后消失 */}
      {!fireBroken && full && (
        <>
          {particles.map((p, i) => (
            <img
              key={i}
              className="intro-fire-particle"
              src={THEME_ASSETS.fire}
              alt=""
              aria-hidden
              draggable={false}
              style={
                {
                  "--dir": `${p.angle}deg`,
                  "--dist": `${p.dist}px`,
                  animationDelay: `${p.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </>
      )}
      <img
        className="intro-vision"
        src={THEME_ASSETS.vision}
        alt=""
        aria-hidden
        draggable={false}
      />
    </span>
  );
}
