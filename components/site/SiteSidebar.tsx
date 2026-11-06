"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, SITE, VISITS } from "@/lib/site";
import VisitorLine from "@/components/interaction/VisitorLine";
import SidebarVision from "@/components/site/SidebarVision";

// 左侧垂直导航栏：品牌区 + 导航链接 + 底部装饰
// 桌面端为固定左侧栏；窄屏降级为顶部横条（见 blog.css 媒体查询）
export default function SiteSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar__brand">
        <span className="sidebar__brand-name">{SITE.name}</span>
        <span className="sidebar__brand-sub">{SITE.description}</span>
      </Link>

      <nav className="sidebar__nav" aria-label="主导航">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__link${
                active ? " sidebar__link--active" : ""
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 3.1 旅人簿：读文章时一直看得到（验收意见 1；原来在页脚最下方看不见） */}
      <div className="sidebar__visits">
        <span className="sidebar__visits-title">{VISITS.sidebarTitle}</span>
        <VisitorLine variant="sidebar" />
      </div>

      <div className="sidebar__foot">
        {/* 9.1：点这枚神之眼，胡桃随机应一声（池子在 public/theme/voice/vision/） */}
        <SidebarVision />
        <small>{SITE.footer}</small>
      </div>
    </aside>
  );
}
