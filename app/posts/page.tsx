import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = { title: "文章" };

export default function PostsPage() {
  const allPosts = getAllPosts();

  return (
    <>
      <h1>全部文章</h1>
      {allPosts.length === 0 ? (
        <p>还没有文章，敬请期待。</p>
      ) : (
        allPosts.map((post) => (
          <article key={post.slug} className="post-item">
            <h2>
              <Link href={`/posts/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="meta">
              {post.date} · {post.tags.join(" / ")}
            </p>
            <p>{post.excerpt}</p>
          </article>
        ))
      )}
    </>
  );
}
