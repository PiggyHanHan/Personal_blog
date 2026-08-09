import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 5);

  return (
    <>
      {/* ---- Hero 区：自我介绍（未来会变成"冒险家档案"卡片） ---- */}
      <section>
        <h1>Hi，我是[你的名字]</h1>
        <p>[待填写：一句话介绍自己]</p>
      </section>

      {/* ---- 冒险者档案：纯文字列表（未来会变成属性面板 / 元素图标，皮肤层再加原神元素） ---- */}
      <section>
        <h2>冒险者档案</h2>
        <ul>
          <li>身份：[待填写]</li>
          <li>技能方向：[待填写]</li>
          <li>当前目标：[待填写]</li>
          <li>签名：[待填写]</li>
        </ul>
      </section>

      {/* ---- 最近的文章（未来会变成"冒险委托"卡片列表） ---- */}
      <section>
        <h2>最近的文章</h2>
        {recentPosts.length === 0 ? (
          <p>还没有文章，敬请期待。</p>
        ) : (
          <ul>
            {recentPosts.map((post) => (
              <li key={post.slug}>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                <span>（{post.date}）</span>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link href="/posts">查看全部文章 →</Link>
        </p>
      </section>
    </>
  );
}
