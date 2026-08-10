import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { POST } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import TagPill from "@/components/ui/TagPill";
import PostBody from "@/components/post/PostBody";
import PostNav from "@/components/post/PostNav";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return { title: post.title };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="page-stack">
      <Frame>
        <Link href="/posts" className="post-back">
          {POST.back}
        </Link>
        <header className="post-head">
          <h1>{post.title}</h1>
          <div className="post-meta">
            <time className="post-date" dateTime={post.date}>
              {post.date}
            </time>
            {post.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        </header>
        <PostBody content={post.content} />
      </Frame>

      <PostNav slug={post.slug} />
    </div>
  );
}
