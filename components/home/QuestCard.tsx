import Link from "next/link";
import type { Post } from "@/lib/posts";
import TagPill from "@/components/ui/TagPill";

// 单张文章卡片（冒险委托卡）：标题 + 日期 + 标签徽章 + 摘要
export default function QuestCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="quest-card"
      data-slug={post.slug}
    >
      <div className="quest-card__head">
        <h3 className="quest-card__title">{post.title}</h3>
        <time className="quest-card__date" dateTime={post.date}>
          {post.date}
        </time>
      </div>
      <div className="quest-card__tags">
        {post.tags.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>
      <p className="quest-card__excerpt">{post.excerpt}</p>
      <span className="quest-card__go">阅读全文 →</span>
    </Link>
  );
}
