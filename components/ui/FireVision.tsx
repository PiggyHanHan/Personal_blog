"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { THEME_ASSETS } from "@/lib/site";

// ============================================================
// 火系神之眼单元：神之眼本体 + 脉动光晕（+ 点亮后的火元素外溢粒子）
//
// 从开屏组件 IntroOverlay 里抽出来共用：开屏进度条两侧、私有文章门扉的叩门按钮、
// 收窗帘的收拢边、文章卡片的热门标记，用的都是这一个组件。
//
// 样式类沿用 globals.css 里的 .intro-vision*（历史命名）：改那组样式会同时影响
// 开屏与门扉，动之前先搜一遍引用。
//
//   full=false  常态：光晕缓慢脉动
//   full=true   点亮：光晕定格到最大，火元素粒子从宝石背后陆续飘出
//
// ⚠️ 三条踩过坑的规矩：
//   1. **只位移、不旋转**：方向算成 --dx/--dy。旧写法 `rotate(var(--dir)) translateX(dist)`
//      会把纹样本身一起转掉，一簇火有的正有的倒（2026-10-11 验收意见 2）。
//   2. **每颗粒子的时长/延迟/距离/尺寸都随机**（下面 makeEmbers）：旧写法把延迟按 i/6 均分、
//      时长固定 2s linear，看起来像节拍器在"固定角频率"地一圈圈扩散，很生硬（验收第二轮意见 2）。
//      现在与点击火花（.spark）共用 @keyframes ember-fly，手感一致。
//   3. **粒子画在宝石下面**（CSS 里 z-index: 1 < .intro-vision 的 2）：火从宝石背后冒出来。
//      否则粒子会糊在宝石上，卡片上那枚小图标就只剩一团火了。
// ============================================================

type Ember = {
  dx: number;
  dy: number;
  size: number;
  life: number;
  delay: number;
};

/** 生成一组"火星"：方向随机、时长/延迟各自不同，所以永远不会同步成整齐的一圈 */
function makeEmbers(compact: boolean): Ember[] {
  return Array.from({ length: compact ? 6 : 9 }, () => {
    const rad = ((Math.random() * 360 - 90) * Math.PI) / 180;
    // 角度 0° 指右，-90° 指上；distance 行内尺寸下收窄，别飞出卡片
    const distance = compact ? 9 + Math.random() * 8 : 36 + Math.random() * 44;
    return {
      dx: Math.round(Math.cos(rad) * distance),
      dy: Math.round(Math.sin(rad) * distance),
      // 开屏/门扉那种大尺寸下给到 15~28px（原来固定 32px，改成随机后略收一点）
      size: Math.round((compact ? 8 + Math.random() * 4 : 15 + Math.random() * 13) * 10) / 10,
      // 时长 0.95~1.85s（compact）/ 1.15~2.05s：各不相同 → 自然错开，不成节拍
      life: Math.round(((compact ? 0.95 : 1.15) + Math.random() * 0.9) * 100) / 100,
      delay: Math.round(Math.random() * (compact ? 0.7 : 1.5) * 100) / 100,
    };
  });
}

export default function FireVision({
  full = false,
  mirror = false,
  compact = false,
  fireBroken = false,
  className = "",
}: {
  /** 点亮态（口令正确 / 进度满 / 卡片点赞数过热度阈值） */
  full?: boolean;
  /** 水平镜像（开屏进度条右侧那枚） */
  mirror?: boolean;
  /**
   * 行内小尺寸（卡片热标记）：粒子飞得近一些、也小一些。
   * 距离/尺寸写在内联 style 里，所以这个开关必须在 JS 里生效，不能只靠 CSS 覆盖。
   */
  compact?: boolean;
  /** 火元素图样素材缺失：只显示神之眼，不画粒子 */
  fireBroken?: boolean;
  /** 额外类名（尺寸等由外部覆盖） */
  className?: string;
}) {
  // 粒子在挂载后再生成：Math.random() 不能出现在 SSR 结果里（否则水合时样式对不上）
  const [embers, setEmbers] = useState<Ember[]>([]);
  useEffect(() => {
    setEmbers(full && !fireBroken ? makeEmbers(compact) : []);
  }, [full, compact, fireBroken]);

  return (
    <span
      className={`intro-vision-wrap${mirror ? " intro-vision-wrap--mirror" : ""}${
        full ? " intro-vision-wrap--full" : ""
      }${compact ? " intro-vision-wrap--compact" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <span className="intro-vision-glow" aria-hidden />
      {/* 火元素纹样：点亮后从宝石背后陆续飘出（画在宝石下面，见 CSS 的 z-index） */}
      {embers.map((e, i) => (
        <img
          key={i}
          className="intro-fire-particle"
          src={THEME_ASSETS.fire}
          alt=""
          aria-hidden
          draggable={false}
          style={
            {
              "--dx": `${e.dx}px`,
              "--dy": `${e.dy}px`,
              "--size": `${e.size}px`,
              "--life": `${e.life}s`,
              animationDelay: `${e.delay}s`,
            } as CSSProperties
          }
        />
      ))}
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
