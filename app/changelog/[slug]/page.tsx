import Link from "next/link";
import { notFound } from "next/navigation";
import { getChangelogEntries, getChangelogBySlug } from "@/lib/changelog";
import { CHANGELOG } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import PostBody from "@/components/post/PostBody";

export function generateStaticParams() {
  return getChangelogEntries().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getChangelogBySlug(slug);
  if (!entry) return {};
  return { title: `${entry.title} · 更新日志` };
}

export default async function ChangelogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getChangelogBySlug(slug);

  if (!entry) {
    notFound();
  }

  return (
    <div className="page-stack">
      <Frame>
        <Link href="/changelog" className="post-back">
          {CHANGELOG.back}
        </Link>
        <header className="post-head">
          <h1>{entry.title}</h1>
          <div className="post-meta">
            <time className="post-date" dateTime={entry.date}>
              {entry.date}
            </time>
          </div>
        </header>

        <PostBody content={entry.content} />
      </Frame>
    </div>
  );
}
