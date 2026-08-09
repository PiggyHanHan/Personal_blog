// 博客的文章数据。
// 之后给博客"加设计"时，这个文件里的内容结构基本不用动，
// 只会在视觉层（页面组件 + CSS）上做文章。

export type Post = {
  /** 文章链接标识，例如 hello-teyvat → /posts/hello-teyvat */
  slug: string;
  /** 文章标题 */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD */
  date: string;
  /** 列表页显示的摘要 */
  excerpt: string;
  /** 标签，例如 ["AI", "LLM"] */
  tags: string[];
  /** 正文，每个字符串是一段文字 */
  content: string[];
};

export const posts: Post[] = [
  {
    slug: "hello-world",
    title: "你好，世界！",
    date: "2026-01-01",
    excerpt: "这是我的第一篇博客，先打个招呼。这个站还在建设中。",
    tags: ["杂谈", "建站"],
    content: [
      "你好，我是这个博客的主人。",
      "这个站点目前还在建设中，具体会写些什么，等想清楚了再告诉大家。",
      "如果你刚好路过，欢迎随便翻翻。",
    ],
  },
];

/** 按日期倒序返回全部文章（最新在前） */
export function getAllPosts(): Post[] {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 根据 slug 找单篇文章，找不到返回 undefined */
export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
