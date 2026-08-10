import { getAllPosts } from "@/lib/posts";
import { POSTS } from "@/lib/site";
import QuestBoard from "@/components/home/QuestBoard";

export const metadata = { title: "文章" };

export default function PostsPage() {
  const allPosts = getAllPosts();

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{POSTS.title}</h1>
        <p>{POSTS.intro}</p>
      </div>
      <QuestBoard posts={allPosts} empty={POSTS.empty} />
    </div>
  );
}
