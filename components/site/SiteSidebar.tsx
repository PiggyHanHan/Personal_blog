"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, SITE } from "@/lib/site";
import ElementIcon from "@/components/ui/ElementIcon";

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

      <div className="sidebar__foot">
        <ElementIcon className="sidebar__vision" />
        <small>{SITE.footer}</small>
      </div>
    </aside>
  );
}
