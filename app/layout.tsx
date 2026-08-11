import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import IntroOverlay from "@/components/layout/IntroOverlay";
import BlogBackground from "@/components/layout/BlogBackground";
import BgProvider from "@/components/providers/BgProvider";
import SoundProvider from "@/components/providers/SoundProvider";
import SettingsButton from "@/components/layout/SettingsButton";
import SiteSidebar from "@/components/site/SiteSidebar";
import SiteFooter from "@/components/site/SiteFooter";
import "./globals.css";
import "./blog.css";

// 读取 public/bg/ 下的背景图列表（服务端执行，加图自动生效，无需改代码）
function getBgImages(): string[] {
  const dir = path.join(process.cwd(), "public", "bg");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort()
      .map((f) => `/bg/${f}`);
  } catch {
    return [];
  }
}

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
        <div className="site-shell">
          <SoundProvider>
            <BgProvider images={getBgImages()}>
              <IntroOverlay />
              <BlogBackground />
              <SiteSidebar />

              <div className="site-main">
                <main>{children}</main>
                <SiteFooter />
              </div>
            </BgProvider>
            <SettingsButton />
          </SoundProvider>
        </div>
      </body>
    </html>
  );
}
