import { Suspense } from "react";
import { getAllPosts, getPostsGrouped } from "@/lib/posts";
import { POSTS } from "@/lib/site";
import QuestCard from "@/components/home/QuestCard";
import TabbedSections from "@/components/site/TabbedSections";

export const metadata = { title: "文章" };

export default function PostsPage() {
  const columns = getPostsGrouped();

  // slug → tab 名映射（"研究文章"/"工程文章"/"生活文章"）。
  // 纯静态数据，序列化传给客户端组件：由 TabbedSections 读取 ?post=<slug>
  // 实现"从详情页返回时定位"，页面本身不依赖 searchParams，保持静态预渲染。
  const slugToTabName: Record<string, string> = {};
  for (const post of getAllPosts()) {
    slugToTabName[post.slug] = `${post.category}文章`;
  }

  const tabs = columns.map((col) => ({
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
  }));

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{POSTS.title}</h1>
        <p>{POSTS.intro}</p>
      </div>

      {/* 顶部切换：研究文章 | 工程文章 | 生活文章 */}
      {/* Suspense 边界：客户端 useSearchParams 需要（Next.js 15 静态渲染要求） */}
      <Suspense fallback={<p className="empty">加载中…</p>}>
        <TabbedSections tabs={tabs} slugToTabName={slugToTabName} />
      </Suspense>
    </div>
  );
}
