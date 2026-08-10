"use client";

import { useEffect, useState } from "react";
import { useBg } from "@/components/BgProvider";

// ============================================================
// 博客背景：渲染层
//
// 轮播状态（洗牌 / 切换计时 / 当前图）由 BgProvider 统一管理，
// 本组件只负责把"当前层 + 过渡层"渲染出来。
//
// 渲染策略（避免"换图闪烁"bug）：
//   平时只渲染"当前层"一层；切换时临时挂载"淡入层"，
//   过渡结束卸载旧层、当前层内容无缝延续，隐藏层不存在 → 不会闪图。
// ============================================================

// 单张背景层
//  - active: 是否完全显示（普通层）
//  - enter: 淡入层（挂载为透明，下一帧激活触发 0→1 过渡）
//  - exit:  淡出层（挂载为显示，下一帧取消激活触发 1→0 过渡）
function BgLayer({
  src,
  active,
  enter,
  exit,
}: {
  src: string;
  active?: boolean;
  enter?: boolean;
  exit?: boolean;
}) {
  const [shown, setShown] = useState(!enter); // enter 初始隐藏，其他初始显示
  useEffect(() => {
    if (enter || exit) {
      // 双 rAF：等浏览器先绘制初始状态（enter=透明 / exit=显示），
      // 第二次 rAF 再切换 className，否则 transition 会被同一帧合并而跳过
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(!!enter));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
  }, [enter, exit]);
  const isActive = exit ? shown : shown && !!active;

  return (
    <div
      className={`blog-bg__layer${isActive ? " blog-bg__layer--active" : ""}`}
      style={{ backgroundImage: `url("${src}")` }}
      aria-hidden
    />
  );
}

export default function BlogBackground() {
  const { images, order, idx, fading } = useBg();

  // 没有图片时不渲染背景层
  if (!images || images.length === 0 || order.length === 0) return null;

  const cur = images[order[idx]];
  const nxt = images[order[(idx + 1) % order.length]];

  return (
    <div className="blog-bg" aria-hidden>
      {fading ? (
        <>
          {/* 旧层：先显示，下一帧取消激活触发 1→0 淡出 */}
          <BgLayer key={`old-${idx}`} src={cur} exit />
          {/* 新层：先透明，下一帧激活触发 0→1 淡入 */}
          <BgLayer key={`new-${idx}`} src={nxt} enter active />
        </>
      ) : (
        /* 平时只有一层，换图在无隐藏层的瞬间完成，不会闪图 */
        <BgLayer key={`cur-${idx}`} src={cur} active />
      )}
      <div className="blog-bg__dim" />
    </div>
  );
}
