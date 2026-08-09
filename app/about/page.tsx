import Link from "next/link";

export const metadata = { title: "关于" };

export default function AboutPage() {
  return (
    <>
      <h1>关于我</h1>

      <section>
        <h2>自我介绍</h2>
        <p>[待填写：自我介绍]</p>
      </section>

      <section>
        <h2>我能做什么</h2>
        <ul>
          <li>[待填写：技能 1]</li>
          <li>[待填写：技能 2]</li>
          <li>[待填写：技能 3]</li>
        </ul>
      </section>

      <section>
        <h2>这个博客在写什么</h2>
        <ul>
          <li>[待填写：文章方向 1]</li>
          <li>[待填写：文章方向 2]</li>
          <li>[待填写：文章方向 3]</li>
        </ul>
      </section>

      <section>
        <h2>联系我</h2>
        <p>
          邮箱：[你的邮箱]
          <br />
          GitHub：[你的 GitHub 链接]
        </p>
      </section>

      <p>
        <Link href="/posts">去看看文章 →</Link>
      </p>
    </>
  );
}
