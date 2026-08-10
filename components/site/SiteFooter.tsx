import { SITE } from "@/lib/site";

// 页脚：金线上沿 + 暖棕小字
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>{SITE.footer}</p>
    </footer>
  );
}
