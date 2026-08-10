import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { POST } from "@/lib/site";

// 上一篇 / 下一篇（按日期相邻）
export default function PostNav({ slug }: { slug: string }) {
  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null; // 更新的一篇
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null; // 更旧的一篇

  return (
    <nav className="post-nav" aria-label="上一篇/下一篇">
      {prev ? (
        <Link href={`/posts/${prev.slug}`} className="post-nav__prev">
          <span>{POST.prev}</span>
          <strong>{prev.title}</strong>
        </Link>
      ) : (
        <span className="post-nav__empty" aria-hidden />
      )}
      {next ? (
        <Link href={`/posts/${next.slug}`} className="post-nav__next">
          <span>{POST.next}</span>
          <strong>{next.title}</strong>
        </Link>
      ) : (
        <span className="post-nav__empty" aria-hidden />
      )}
    </nav>
  );
}
