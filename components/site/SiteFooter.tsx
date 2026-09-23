import { SITE } from "@/lib/site";

// 页脚：金线上沿 + 版权行 + 建站时间
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>{SITE.footer}</p>
      <p className="site-footer__built">{SITE.builtAt}</p>
    </footer>
  );
}
