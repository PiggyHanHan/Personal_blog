// ============================================================
// 博客的文章数据。
// 加新文章：在 posts 数组里加一项，正文用块级结构（Block）。
// ============================================================

/** 正文的一个块。支持段落 / 小节标题 / 引用 / 列表 / 代码块 / 插图 */
export type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "code"; lang?: string; code: string }
  | { type: "image"; src: string; alt?: string; caption?: string };

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
  /** 正文：块级结构，见上方 Block 类型 */
  content: Block[];
};

export const posts: Post[] = [
  {
    slug: "hello-world",
    title: "你好，世界！",
    date: "2026-08-10",
    excerpt: "这是我的第一篇博客，先打个招呼。这个站还在建设中。",
    tags: ["杂谈", "建站"],
    content: [
      { type: "paragraph", text: "你好，我是这个博客的主人。" },
      {
        type: "paragraph",
        text: "这个站点目前还在建设中，具体会写些什么，等想清楚了再告诉大家。",
      },
      {
        type: "quote",
        text: "如果你刚好路过，欢迎随便翻翻。",
      },
      { type: "heading", level: 2, text: "接下来打算写什么" },
      {
        type: "list",
        items: ["AI 学习笔记", "踩坑记录", "随笔杂谈"],
      },
      {
        type: "paragraph",
        text: "以上都还没开始，敬请期待。",
      },
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
