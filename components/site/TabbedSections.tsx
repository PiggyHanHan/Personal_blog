"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

// 顶部切换：把内容按 tab 分组，一次只显示一组
// 文章页（研究文章|工程文章|生活文章）、项目页（学术项目|个人项目）共用
//
// 可选定位：initialTabName 决定初始选中哪个 tab；scrollToSlug 对应卡片有
// data-slug 属性，渲染后滚动到它并尽量居中（卡片比视口高时对齐顶部）。
// 文章页额外支持 URL 定位：传 slugToTabName（slug → tab 名映射）后，
// ?post=<slug> 会覆盖 initialTabName / scrollToSlug，从详情页返回时
// 自动定位到正在读的那篇文章（优先级：URL > props）。
export default function TabbedSections({
  tabs,
  initialTabName,
  scrollToSlug,
  slugToTabName,
}: {
  tabs: { name: string; content: ReactNode }[];
  initialTabName?: string;
  scrollToSlug?: string;
  slugToTabName?: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const urlSlug = searchParams.get("post");
  const urlTabName =
    urlSlug && slugToTabName ? slugToTabName[urlSlug] : undefined;
  const resolvedTabName = urlTabName ?? initialTabName;
  const resolvedScroll = urlSlug && slugToTabName ? urlSlug : scrollToSlug;

  const [active, setActive] = useState(() => {
    if (resolvedTabName) {
      const idx = tabs.findIndex((t) => t.name === resolvedTabName);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  // 从详情页返回：滚动到正在读的那篇文章卡片，尽量居中
  useEffect(() => {
    if (!resolvedScroll) return;
    const el = document.querySelector<HTMLElement>(
      `[data-slug="${resolvedScroll}"]`
    );
    if (el) el.scrollIntoView({ block: "center" });
  }, [resolvedScroll, active]);

  return (
    <div className="tabbed">
      <div className="tabbed__tabs" role="tablist" aria-label="切换分类">
        {tabs.map((tab, i) => (
          <button
            key={tab.name}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`tabbed__tab${i === active ? " tabbed__tab--active" : ""}`}
            onClick={() => setActive(i)}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="tabbed__panel" role="tabpanel">
        {tabs[active]?.content}
      </div>
    </div>
  );
}
