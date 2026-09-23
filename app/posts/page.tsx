import { Suspense } from "react";
import { getAllPosts, getPostsGrouped, toSummary } from "@/lib/posts";
import { buildSearchDocs } from "@/lib/searchIndex";
import { POSTS } from "@/lib/site";
import QuestCard from "@/components/home/QuestCard";
import TabbedSections from "@/components/site/TabbedSections";
import PostSearch from "@/components/post/PostSearch";

export const metadata = { title: "文章" };

export default function PostsPage() {
  const allPosts = getAllPosts();
  const columns = getPostsGrouped();

  // slug → tab 名映射（"研究文章"/"工程文章"/"生活文章"）。
  // 纯静态数据，序列化传给客户端组件：由 TabbedSections 读取 ?post=<slug>
  // 实现"从详情页返回时定位"，页面本身不依赖 searchParams，保持静态预渲染。
  const slugToTabName: Record<string, string> = {};
  for (const post of allPosts) {
    slugToTabName[post.slug] = `${post.category}文章`;
  }

  // 搜索索引：构建时算好（含拼音），随静态页面一起下发，浏览器端只做匹配。
  // 只喂摘要（toSummary）：私有文章的密文没必要塞进列表页载荷。
  const searchDocs = buildSearchDocs(allPosts.map(toSummary));

  const tabs = columns.map((col) => ({
    name: `${col.name}文章`,
    content:
      col.posts.length > 0 ? (
        <div className="quest-board">
          {col.posts.map((post) => (
            <QuestCard key={post.slug} post={toSummary(post)} />
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

      {/* 搜索框 + （未搜索时）分类 tab：输入即下拉预览，回车切换成整页结果 */}
      {/* Suspense 边界：客户端 useSearchParams 需要（Next.js 15 静态渲染要求） */}
      <Suspense fallback={<p className="empty">加载中…</p>}>
        <PostSearch docs={searchDocs}>
          <TabbedSections tabs={tabs} slugToTabName={slugToTabName} />
        </PostSearch>
      </Suspense>
    </div>
  );
}
