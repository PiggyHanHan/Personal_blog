import { THEME_ASSETS } from "@/lib/site";

// 火系神之眼点缀图标（纯装饰，尺寸/定位由 className 传入）
//
// ⚠️ 素材走 THEME_ASSETS.vision（public/theme/fire-vision.webp）——**不要再写死
//    /hutao/使用中/小素材/火系神之眼.png**：那个目录不在部署包白名单里（AGENTS.md §0.4），
//    线上能显示只是因为当初整包部署过，换台机器全新部署就是 404。
//    侧边栏那枚已经是可点的按钮（components/site/SidebarVision.tsx），别在这里加点击逻辑。
export default function ElementIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`element-icon${className ? ` ${className}` : ""}`}
      src={THEME_ASSETS.vision}
      alt=""
      aria-hidden
      draggable={false}
    />
  );
}
