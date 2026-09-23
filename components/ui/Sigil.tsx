import { THEME_ASSETS } from "@/lib/site";

// 主题纹章：公开内容用「胡桃的安魂」（暖色小鼻涕），私有 / 加密内容用「七七的蓝色魂魄」（冷色）。
// 纯展示组件（无 hooks、无 node 依赖），服务端组件与客户端组件都能渲染。
// 只是装饰：语义信息由旁边的「需口令」徽章承担，所以 alt 留空、对读屏隐藏。
export default function Sigil({ variant }: { variant: "public" | "private" }) {
  const isPrivate = variant === "private";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`sigil sigil--${isPrivate ? "private" : "public"}`}
      src={isPrivate ? THEME_ASSETS.sigilPrivate : THEME_ASSETS.sigilPublic}
      alt=""
      aria-hidden
      decoding="async"
    />
  );
}
