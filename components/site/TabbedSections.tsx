"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

// 顶部切换：把内容按 tab 分组，一次只显示一组
// 文章页（学术文章|个人文章）、项目页（学术项目|个人项目）共用
//
// 可选定位：initialTabName 决定初始选中哪个 tab；scrollToSlug 对应卡片有
// data-slug 属性，渲染后滚动到它并尽量居中（卡片比视口高时对齐顶部）。
export default function TabbedSections({
  tabs,
  initialTabName,
  scrollToSlug,
}: {
  tabs: { name: string; content: ReactNode }[];
  initialTabName?: string;
  scrollToSlug?: string;
}) {
  const [active, setActive] = useState(() => {
    if (initialTabName) {
      const idx = tabs.findIndex((t) => t.name === initialTabName);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  // 从详情页返回：滚动到正在读的那篇文章卡片，尽量居中
  useEffect(() => {
    if (!scrollToSlug) return;
    const el = document.querySelector<HTMLElement>(
      `[data-slug="${scrollToSlug}"]`
    );
    if (el) el.scrollIntoView({ block: "center" });
  }, [scrollToSlug, active]);

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
