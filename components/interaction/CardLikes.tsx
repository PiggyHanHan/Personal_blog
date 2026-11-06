"use client";

import { REACTIONS, THEME_ASSETS } from "@/lib/site";
import { useReactions } from "@/lib/reactionStore";
import FireVision from "@/components/ui/FireVision";

// ============================================================
// 文章卡片右下角的赞数（计划 3.5，按 2026-10-11 验收意见改版）
//
// 验收意见原文：
//   "这个赞的图标好丑，卡片上就用文字显示如「点赞：xxx」，然后在该文字左边加上一个
//    火元素神之眼的和文字同高缩放的图，同时设定一个热度阈值，阈值高于 100 咱们就让
//    神之眼冒火元素纹样，就是开屏里加载条加载满时的那种。"
//
// 所以：
//   · 图标换成**火系神之眼**（THEME_ASSETS.vision），高度跟文字一样，用 CSS 的 1.05em 缩放；
//   · 文案「点赞：12」；
//   · 赞数 ≥ REACTIONS.hotThreshold（100）时，神之眼换成 <FireVision full compact>——
//     与开屏进度条加载满时**同一种**火元素外溢效果，只是距离/尺寸按行内尺寸缩小（compact）；
//   · 0 赞仍然什么都不渲染（不显示"零赞"、不占位）；私有文章默认不露（§0.6 D5）。
//
// 数字来自 lib/reactionStore.ts 的全站共享快照：一页十几张卡片只发 1 个请求。
// ============================================================
export default function CardLikes({
  slug,
  isPrivate = false,
}: {
  slug: string;
  /** 私有文章：列表卡片上不露出互动数（详情页解锁后照常显示） */
  isPrivate?: boolean;
}) {
  const snapshot = useReactions();
  const value = snapshot.counts[slug]?.like ?? 0;

  if (isPrivate && !REACTIONS.exposePrivateOnCards) return null;
  if (value <= 0) return null;

  const hot = value >= REACTIONS.hotThreshold;

  return (
    <span
      className={`quest-card__likes${hot ? " quest-card__likes--hot" : ""}`}
      title={hot ? `${value} 人点赞 · 已发热` : `${value} 人点赞`}
    >
      {/* 热度够了就让神之眼冒火（与开屏加载满时同一种效果，尺寸按行内缩小） */}
      {hot ? (
        <FireVision full compact className="quest-card__vision" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="quest-card__vision"
          src={THEME_ASSETS.vision}
          alt=""
          aria-hidden
          draggable={false}
        />
      )}
      {REACTIONS.cardLabel}
      {value}
    </span>
  );
}
