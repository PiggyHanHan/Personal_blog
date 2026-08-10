import Link from "next/link";
import type { Post } from "@/lib/posts";
import { HOME } from "@/lib/site";
import SectionTitle from "@/components/site/SectionTitle";
import QuestCard from "@/components/home/QuestCard";

// 委托列表容器：可选区块标题 + 卡片组 + 可选"查看更多"
export default function QuestBoard({
  posts,
  title,
  showMore = false,
  empty = HOME.empty,
}: {
  posts: Post[];
  title?: string;
  showMore?: boolean;
  empty?: string;
}) {
  return (
    <section>
      {title ? <SectionTitle title={title} /> : null}
      {posts.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="quest-board">
          {posts.map((post) => (
            <QuestCard key={post.slug} post={post} />
          ))}
        </div>
      )}
      {showMore && posts.length > 0 && (
        <p className="quest-board__more">
          <Link href="/posts">{HOME.questsMore}</Link>
        </p>
      )}
    </section>
  );
}
