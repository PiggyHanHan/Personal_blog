// ============================================================
// 博客的文章数据：读取 content/posts/ 下的 Markdown 文件。
// 加新文章：在 content/posts/ 下新建 .md 文件，文件头用 YAML frontmatter 写元信息：
//   ---
//   title: 文章标题
//   slug: my-post            # 链接标识 → /posts/my-post（必须英文；省略时用文件名）
//   date: 2026-08-10        # YYYY-MM-DD
//   category: 个人           # 文章分类：学术 | 个人（决定文章页落在哪一列；缺省为个人）
//   excerpt: 列表页摘要
//   tags: [AI, 笔记]
//   ---
// 正文直接写 Markdown。文件名可以用中文，但链接取决于 slug（或文件名）。
// 注意：slug 只能是英文字母/数字/下划线/连字符——中文 slug 会导致详情页 404。
// 此模块仅在服务端组件中使用。
// ============================================================
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import matter from "gray-matter";
import { markdownToBlocks } from "./markdown";

/** 正文的一个块。支持段落 / 小节标题 / 引用 / 列表 / 代码块 / 插图 */
export type Block =
  | { type: "heading"; level: 2 | 3; text: ReactNode }
  | { type: "paragraph"; text: ReactNode }
  | { type: "quote"; text: ReactNode }
  | { type: "list"; ordered?: boolean; items: ReactNode[] }
  | { type: "code"; lang?: string; code: string }
  | { type: "image"; src: string; alt?: string; caption?: string };

/** 文章分类：学术 | 个人（文章页按此分成两列） */
export const POST_CATEGORIES = ["学术", "个人"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export type Post = {
  /** 文章链接标识，取自文件名，例如 hello-world.md → /posts/hello-world */
  slug: string;
  /** 文章标题 */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD */
  date: string;
  /** 文章分类：学术 | 个人，决定文章页落在哪一列（缺省为个人） */
  category: PostCategory;
  /** 列表页显示的摘要 */
  excerpt: string;
  /** 标签，例如 ["AI", "LLM"] */
  tags: string[];
  /** PDF 全文（可选）：frontmatter 的 pdf 字段，如 /files/xxx.pdf，文章页内嵌在线阅读 */
  pdf?: string;
  /** 正文：块级结构，见上方 Block 类型 */
  content: Block[];
};

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function loadAllPosts(): Post[] {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = readFileSync(path.join(POSTS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      // 链接标识：frontmatter 的 slug 优先，省略时取文件名
      const slug = str(data.slug, path.basename(file, ".md"));
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug)) {
        throw new Error(
          `[posts] 文章「${file}」的 slug「${slug}」只能包含英文字母、数字、下划线、连字符，且不能以符号开头。` +
            `中文文件名请在 frontmatter 里显式指定英文 slug，例如：\n---\ntitle: ...\nslug: my-post\n---`
        );
      }
      // 分类：frontmatter 的 category，非“学术/个人”或缺省时归为“个人”
      const rawCategory = str(data.category, "个人");
      const category: PostCategory = (
        POST_CATEGORIES as readonly string[]
      ).includes(rawCategory)
        ? (rawCategory as PostCategory)
        : "个人";

      return {
        slug,
        title: str(data.title, path.basename(file, ".md")),
        date: str(data.date, "1970-01-01"),
        category,
        excerpt: str(data.excerpt, ""),
        tags: Array.isArray(data.tags)
          ? data.tags.filter((t): t is string => typeof t === "string")
          : [],
        pdf: str(data.pdf, "") || undefined,
        content: markdownToBlocks(content),
      };
    });
}

function str(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim() !== "") return value;
  // YAML 会把裸日期（如 2026-08-10）解析成 Date 对象。
  // 用本地时间组件拼字符串，避免 toISOString() 的 UTC 转换在 +8 时区把日期回退一天。
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return fallback;
}

/** 按日期倒序返回全部文章（最新在前） */
export function getAllPosts(): Post[] {
  return loadAllPosts().sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 文章页分组：按分类返回各列（顺序固定：学术在前、个人在后），每列按日期倒序 */
export function getPostsGrouped(): { name: PostCategory; posts: Post[] }[] {
  const all = getAllPosts();
  return POST_CATEGORIES.map((name) => ({
    name,
    posts: all.filter((p) => p.category === name),
  }));
}

/** 根据 slug 找单篇文章，找不到返回 undefined */
export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
