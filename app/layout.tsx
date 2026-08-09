import type { Metadata } from "next";
import Link from "next/link";
import IntroOverlay from "@/components/IntroOverlay";
import SkyBackground from "@/components/SkyBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "旅行者的见闻录",
    template: "%s · 旅行者的见闻录",
  },
  description: "一个 AI 学习者的个人博客（纯文字骨架版）",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SkyBackground />
        <div className="site-shell">
          <IntroOverlay />
          <header>
            <nav>
              <Link href="/">首页</Link>
              <Link href="/posts">文章</Link>
              <Link href="/about">关于</Link>
            </nav>
          </header>

          <main>{children}</main>

          <footer>
            <p>© 2026 旅行者的见闻录</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
