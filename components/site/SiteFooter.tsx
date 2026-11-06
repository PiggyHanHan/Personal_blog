import { SITE } from "@/lib/site";

// 页脚：金线上沿 + 版权行 + 建站时间
// （3.1 的「旅人簿」原本挂在这里，2026-10-11 验收意见：页面最下方访客看不到，
//   已移到**开屏欢迎语下方**与**左侧导航栏**，见 components/interaction/VisitorLine.tsx）
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>{SITE.footer}</p>
      <p className="site-footer__built">{SITE.builtAt}</p>
    </footer>
  );
}
