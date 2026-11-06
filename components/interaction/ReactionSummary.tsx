"use client";

import { REACTIONS } from "@/lib/site";
import { useReactions } from "@/lib/reactionStore";

// ============================================================
// 文章标题下的互动统计（验收意见 3：读之前就知道这篇的评价）
//
// 只**显示**，不是入口——真正能点的是文末的 <ReactionBar>。
// 数字来自 lib/reactionStore.ts 的全站共享快照（与卡片赞数、文末互动条同一份，
// 整站只发一次 GET /api/like），所以这里不产生任何额外请求。
//
// 一条反应都没有时**整块不渲染**（空壳比"0 赞"更难看）；
// 私有文章也会渲染，但锁屏是全屏接管（z-index 9000），解锁前根本看不到它 —— 与 §0.6 D5 的默认口径一致。
// ============================================================
export default function ReactionSummary({ slug }: { slug: string }) {
  const snapshot = useReactions();
  const counts = snapshot.counts[slug] ?? {};

  const items = REACTIONS.kinds
    .map((kind) => ({ ...kind, value: counts[kind.key] ?? 0 }))
    .filter((item) => item.value > 0);

  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <span className="post-reactions" title={`共 ${total} 个读后留痕`}>
      <span className="post-reactions__label">{REACTIONS.title}</span>
      {items.map((item) => (
        <span key={item.key} className="post-reactions__item">
          <span aria-hidden>{item.emoji}</span>
          <span className="visually-hidden">{item.label}</span>
          {item.value}
        </span>
      ))}
    </span>
  );
}
