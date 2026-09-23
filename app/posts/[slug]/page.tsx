import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, isPrivatePreview } from "@/lib/posts";
import { POST, PRIVATE_UI } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import TagPill from "@/components/ui/TagPill";
import PostBody from "@/components/post/PostBody";
import PostNav from "@/components/post/PostNav";
import PdfPreview from "@/components/post/PdfPreview";
import PrivateGate from "@/components/post/PrivateGate";

/** /files/xxx.pdf → /api/view/xxx.pdf（浏览器内联预览，不触发下载） */
function toViewHref(pdf: string): string {
  return `/api/view${pdf.replace(/^\/files/, "")}`;
}

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

  // 私有文章：构建期已把正文加密（post.encrypted），详情页换成往生堂门扉；
  // 本地预览（SKIP_ENCRYPT=true）没有密文，正文照常明文渲染，只加一条提示。
  const locked = Boolean(post.encrypted);

  // 内嵌 PDF 附件（如果有）：加密文章连附件一起放进门后，只在解锁后渲染
  const pdfSlot = post.pdf ? <PdfPreview src={toViewHref(post.pdf)} /> : null;

  return (
    <div className="page-stack">
      <Frame>
        <Link href={`/posts?post=${post.slug}`} className="post-back">
          {POST.back}
        </Link>
        <header className="post-head">
          <h1>{post.title}</h1>
          <div className="post-meta">
            <time className="post-date" dateTime={post.date}>
              {post.date}
            </time>
            {post.private ? (
              <span className="locked-pill" title={PRIVATE_UI.footnote}>
                <span aria-hidden>🔒</span> {PRIVATE_UI.headBadge}
              </span>
            ) : null}
            {post.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        </header>

        {locked ? (
          <PrivateGate payload={post.encrypted!} slug={post.slug}>
            {pdfSlot}
          </PrivateGate>
        ) : (
          <>
            {post.private && isPrivatePreview() ? (
              <p className="post-preview-note">{PRIVATE_UI.previewNote}</p>
            ) : null}
            {pdfSlot}
            <PostBody content={post.content} />
          </>
        )}
      </Frame>

      <PostNav slug={post.slug} />
    </div>
  );
}
