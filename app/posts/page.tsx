import { getAllPosts, getPostsGrouped } from "@/lib/posts";
import { POSTS } from "@/lib/site";
import QuestCard from "@/components/home/QuestCard";
import TabbedSections from "@/components/site/TabbedSections";

export const metadata = { title: "文章" };

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { post: postSlug } = await searchParams;
  const columns = getPostsGrouped();

  // 从详情页返回时定位：找到正在读的文章，决定初始 tab 与滚动目标
  const target = postSlug
    ? getAllPosts().find((p) => p.slug === postSlug)
    : undefined;

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{POSTS.title}</h1>
        <p>{POSTS.intro}</p>
      </div>

      {/* 顶部切换：学术文章 | 个人文章 */}
      <TabbedSections
        tabs={columns.map((col) => ({
          name: `${col.name}文章`,
          content:
            col.posts.length > 0 ? (
              <div className="quest-board">
                {col.posts.map((post) => (
                  <QuestCard key={post.slug} post={post} />
                ))}
              </div>
            ) : (
              <p className="empty">{POSTS.empty}</p>
            ),
        }))}
        initialTabName={target ? `${target.category}文章` : undefined}
        scrollToSlug={postSlug}
      />
    </div>
  );
}
