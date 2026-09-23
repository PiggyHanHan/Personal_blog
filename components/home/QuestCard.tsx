import Link from "next/link";
import type { PostSummary } from "@/lib/posts";
import { PRIVATE_UI } from "@/lib/site";
import Sigil from "@/components/ui/Sigil";
import TagPill from "@/components/ui/TagPill";

// 单张文章卡片（冒险委托卡）：标题 + 日期 + 标签徽章 + 摘要
// 只用 PostSummary（不含正文 / 密文），所以既能被服务端组件渲染，也能被搜索结果的客户端组件复用
// 私有文章：多一枚「需口令」徽章，纹章换成七七蓝魂魄（公开文章是胡桃的安魂）
export default function QuestCard({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={`quest-card${post.private ? " quest-card--private" : ""}`}
      data-slug={post.slug}
    >
      <div className="quest-card__head">
        <h3 className="quest-card__title">{post.title}</h3>
        <time className="quest-card__date" dateTime={post.date}>
          {post.date}
        </time>
      </div>
      <div className="quest-card__tags">
        {post.private ? (
          <span className="locked-pill" title={PRIVATE_UI.footnote}>
            <span aria-hidden>🔒</span> {PRIVATE_UI.badge}
          </span>
        ) : null}
        {post.tags.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>
      <p className="quest-card__excerpt">{post.excerpt}</p>
      <div className="quest-card__foot">
        <span className="quest-card__go">
          {post.private ? "输入口令 →" : "阅读全文 →"}
        </span>
      </div>
      {/* 纹章：骑在卡片右下角（~1/3 在内、2/3 在外），位置/尺寸见 blog.css 的 .quest-card > .sigil */}
      <Sigil variant={post.private ? "private" : "public"} />
    </Link>
  );
}
