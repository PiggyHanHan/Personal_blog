"use client";

import { REACTIONS } from "@/lib/site";
import { toggleReaction, useReactions } from "@/lib/reactionStore";
import ViewCount from "@/components/interaction/ViewCount";

// ============================================================
// 文末互动条（计划 3.4 点赞 + 3.6 多表情反应 + 3.20 阅读数）
//
// 放在文章正文之后；**私有文章要把这个组件放进 PrivateGate 的 children 里**，
// 这样它只在解锁后出现（§0.6 D5 的默认口径：私有文章不公开露出互动）。
//
// 计数与"我点过没有"都来自 lib/reactionStore.ts 的那一份全站共享快照，
// 不在这个组件里发请求（详情页与列表页共用同一个 GET）。
// 标题旁的「翻阅 N 次」（3.20）来自 lib/visitStore.ts 的另一份快照，同样零额外请求；
// 私有文章的阅读数服务端不会下发，<ViewCount> 自己就不渲染。
// ============================================================
export default function ReactionBar({ slug }: { slug: string }) {
  const snapshot = useReactions();
  const counts = snapshot.counts[slug] ?? {};

  return (
    <section className="reactions" aria-label={REACTIONS.title}>
      <div className="reactions__head">
        <span className="reactions__title">{REACTIONS.title}</span>
        {/* 3.20：这篇被翻开的次数（与标题下那枚同一份数字、同一个组件） */}
        <ViewCount slug={slug} className="view-count--end" />
        <span className="reactions__intro" title={REACTIONS.hint}>
          {REACTIONS.intro}
        </span>
      </div>

      <div className="reactions__row">
        {REACTIONS.kinds.map(({ key, emoji, label }) => {
          const pressed = snapshot.mine.has(`${slug}|${key}`);
          const value = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              className="reactions__btn"
              aria-pressed={pressed}
              aria-label={value > 0 ? `${label}（${value}）` : label}
              title={label}
              onClick={() => {
                void toggleReaction(slug, key);
              }}
            >
              <span className="reactions__emoji" aria-hidden>
                {emoji}
              </span>
              <span className="reactions__label">{label}</span>
              {/* 0 不显示，避免一排干巴巴的"0" */}
              {value > 0 ? (
                <span className="reactions__count">{value}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
