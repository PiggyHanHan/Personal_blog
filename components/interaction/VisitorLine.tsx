"use client";

import { VISITS } from "@/lib/site";
import { formatCount, useVisitStats } from "@/lib/visitStore";

// ============================================================
// 「旅人簿」显示（计划 3.1）——两处共用同一份数字，不再各拉一次
//
//   开屏   variant="intro"    只留一句「你是今日第 N 位旅人」
//                             （2026-10-11 第二次验收：历史累计数字太大、反而没有社交气息，
//                               而且原来的"第 N 位 / 累计翻阅"没说清是今天还是历史 → 开屏只留今日序号）
//   侧边栏 variant="sidebar"  同一句 + 今日翻阅次数 + 历史来访旅人 + 历史翻阅次数
//                             （今天/历史各自标清，不再有"这个数字是哪个口径"的歧义）
//
// 数据没回来时显示占位、接口挂了显示"暂不可用"，绝不显示假数字，也不让布局跳动。
// ============================================================
export default function VisitorLine({
  variant = "intro",
}: {
  variant?: "intro" | "sidebar";
}) {
  const { stats, failed } = useVisitStats();

  if (!stats) {
    // 占位/失败都只占一行小字：布局不跳、也不闪假数字
    return (
      <p className={`visits visits--${variant} visits--quiet`} title={VISITS.hint}>
        {failed ? VISITS.unavailable : VISITS.placeholder}
      </p>
    );
  }

  // 开屏与侧边栏共用第一句（"今日第 N 位"：当前这位已计入，所以 N 就是今日来访旅人数）
  const ordinal = (
    <span className="visits__ordinal">
      {VISITS.ordinalPrefix}
      <strong>{formatCount(stats.today.visitors)}</strong>
      {VISITS.ordinalSuffix}
    </span>
  );

  if (variant === "intro") {
    return (
      <p className="visits visits--intro" title={VISITS.hint}>
        {ordinal}
      </p>
    );
  }

  return (
    <p className="visits visits--sidebar" title={VISITS.hint}>
      {ordinal}
      <span className="visits__row">
        {VISITS.todayViewsLabel}：<strong>{formatCount(stats.today.views)}</strong>
        {VISITS.todayViewsUnit}
      </span>
      <span className="visits__row">
        {VISITS.totalVisitorsLabel}：<strong>{formatCount(stats.total.visitors)}</strong>
        {VISITS.totalVisitorsUnit}
      </span>
      <span className="visits__row">
        {VISITS.totalViewsLabel}：<strong>{formatCount(stats.total.views)}</strong>
        {VISITS.totalViewsUnit}
      </span>
    </p>
  );
}
