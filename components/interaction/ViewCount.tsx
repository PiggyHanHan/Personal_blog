"use client";

import { VISIT_COUNT } from "@/lib/site";
import { formatCount, usePostViewCount } from "@/lib/visitStore";

// ============================================================
// 单篇文章的阅读数（计划 3.20）—— 只读，两处共用：
//   ① 文章标题下，紧挨着 <ReactionSummary>（读之前就知道这篇有多少人翻开过）
//   ② 文末互动条 <ReactionBar> 的标题旁
//
// 数字来自 /api/stats 的 `posts`，并进 lib/visitStore.ts 的**同一份快照**——
// 也就是 VisitReporter 那次 POST 的响应，所以这里**不产生任何额外请求**
// （全站仍然只有一次 stats + 一次 like，见 3.20 的第 ① 条）。
//
// 三种"不渲染"的情形，一个都不能少：
//   · 数字还没回来（快照未就绪 / 接口挂了）→ 不占位、不显示假数字；
//   · 一次都没人翻开过（服务端不会给这个 slug）→ **不显示 0**
//     （显示 0 等于告诉访客"这篇没人看过"，还会让人以为数据坏了）；
//   · **私有文章** → 服务端压根不把它放进公开映射（lib/analytics.ts 的 publicViewCounts），
//     这里拿不到数就什么都不渲染，锁屏上也绝不会漏出浏览量。
//
// 口径：**翻阅次数（PV）**，同一个人多次打开会重复计数（同路径 10 秒内去重）。
// 所以文案只有「翻阅 N 次」，没有"人"字——两种口径不能混着显示。
// ============================================================
export default function ViewCount({
  slug,
  className = "",
}: {
  slug: string;
  /** 额外的样式钩子（标题下与文末那行共用一个组件，但外观不同） */
  className?: string;
}) {
  const value = usePostViewCount(slug);

  if (value === null) return null;

  return (
    <span
      className={`view-count${className ? ` ${className}` : ""}`}
      title={VISIT_COUNT.hint}
    >
      <span className="view-count__label">{VISIT_COUNT.label}</span>
      {/* 读屏体验：连着读就是「翻阅 12 次」。
          ⚠️ 这里**不要**再塞一个 .visually-hidden 的"翻阅次数"——第一版加了，
          结果整枚徽章的 textContent 变成"翻阅翻阅次数4次"（可见文字与读屏文字重复），
          真浏览器实测抓到过。可见文字已经是完整句子时，读屏标签就是多余的。 */}
      <strong className="view-count__value">{formatCount(value)}</strong>
      {VISIT_COUNT.unit}
    </span>
  );
}
