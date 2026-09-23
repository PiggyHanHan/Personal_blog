// ============================================================
// 博客的文章数据：读取 content/posts/ 下的 Markdown 文件。
// 加新文章：在 content/posts/ 下新建 .md 文件，文件头用 YAML frontmatter 写元信息：
//   ---
//   title: 文章标题
//   slug: my-post            # 链接标识 → /posts/my-post（必须英文；省略时用文件名）
//   date: 2026-08-10        # YYYY-MM-DD
//   category: 研究           # 文章分类：研究 | 工程 | 生活（决定文章页落在哪个 tab；缺省为生活）
//   excerpt: 列表页摘要
//   tags: [AI, 笔记]
//   private: true           # 私有文章 → 构建时 AES-256 加密正文（详见 docs/dev/私有文章加密.md）
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
import { blocksToHtml, encryptHtml, isEncryptSkipped, privatePassword } from "./privateContent";
import type { PrivatePayload } from "./privateCrypto";

/** 插图：src 为站点根路径（如 /md_images/xxx.png），可选 alt / 图注 */
export type PostImage = { src: string; alt?: string; caption?: string };

/** 正文的一个块。支持段落 / 小节标题 / 引用 / 列表 / 代码块 / 插图 / 图片行 */
export type Block =
  | { type: "heading"; level: 2 | 3; text: ReactNode }
  | { type: "paragraph"; text: ReactNode }
  | { type: "quote"; text: ReactNode }
  | { type: "list"; ordered?: boolean; items: ReactNode[] }
  | { type: "code"; lang?: string; code: string }
  | { type: "math"; latex: string; html: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "imageRow"; images: PostImage[] }
  | { type: "imageGrid"; rows: PostImage[][] }
  | { type: "table"; align: (string | null)[]; head: ReactNode[]; rows: ReactNode[][] };

/** 文章分类：研究 | 工程 | 生活（文章页按此分成三个 tab，顺序从左到右） */
export const POST_CATEGORIES = ["研究", "工程", "生活"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export type Post = {
  /** 文章链接标识，取自文件名，例如 hello-world.md → /posts/hello-world */
  slug: string;
  /** 文章标题 */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD */
  date: string;
  /** 文章分类：研究 | 工程 | 生活，决定文章页落在哪个 tab（缺省为生活） */
  category: PostCategory;
  /** 列表页显示的摘要 */
  excerpt: string;
  /** 标签，例如 ["AI", "LLM"] */
  tags: string[];
  /** PDF 全文（可选）：frontmatter 的 pdf 字段，如 /files/xxx.pdf，文章页内嵌在线阅读 */
  pdf?: string;
  /** 是否为私有文章（frontmatter: private: true） */
  private: boolean;
  /**
   * 私有文章的加密正文载荷（构建期生成）。
   * 本地预览（SKIP_ENCRYPT=true）时为 undefined，此时正文以明文放在 content 里。
   */
  encrypted?: PrivatePayload;
  /** 正文：块级结构，见上方 Block 类型。加密文章为 []（正文在 encrypted 里） */
  content: Block[];
};

/**
 * 列表 / 卡片 / 搜索用的文章信息（不含正文与密文）。
 * 正文里的 Block 带 ReactNode、密文又太大，都不适合序列化给客户端组件，
 * 所以卡片统一用这个类型；用 toSummary() 从 Post 转换。
 */
export type PostSummary = Omit<Post, "content" | "encrypted">;

/** Post → PostSummary（卡片 / 搜索索引用；避免把正文和密文塞进客户端载荷） */
export function toSummary(post: Post): PostSummary {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    category: post.category,
    excerpt: post.excerpt,
    tags: post.tags,
    pdf: post.pdf,
    private: post.private,
  };
}

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/** 标记私有文章的 tag（写了这些 tag 等同于 private: true，且不会显示成标签徽章） */
const PRIVATE_TAGS = new Set(["private", "私有", "加密"]);

/** 构建期提示只打一次（loadAllPosts 在构建过程中会被调用很多次） */
let warnedSkipEncrypt = false;

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
      // 分类：frontmatter 的 category，非“研究/工程/生活”或缺省时归为“生活”
      const rawCategory = str(data.category, "生活");
      const category: PostCategory = (
        POST_CATEGORIES as readonly string[]
      ).includes(rawCategory)
        ? (rawCategory as PostCategory)
        : "生活";

      // 标签：字符串数组；标记私有的 tag（private / 私有 / 加密）不当作展示标签
      const rawTags = Array.isArray(data.tags)
        ? data.tags.filter((t): t is string => typeof t === "string")
        : [];
      const isPrivate =
        data.private === true ||
        String(data.private).toLowerCase() === "true" ||
        rawTags.some((t) => PRIVATE_TAGS.has(t.trim().toLowerCase()));
      const tags = rawTags.filter((t) => !PRIVATE_TAGS.has(t.trim().toLowerCase()));

      const blocks = markdownToBlocks(content);

      // 私有文章：生产构建加密正文；本地预览（SKIP_ENCRYPT=true）保持明文
      let encrypted: PrivatePayload | undefined;
      let finalBlocks = blocks;
      if (isPrivate && !isEncryptSkipped()) {
        const password = privatePassword();
        if (!password) {
          throw new Error(
            `[posts] 文章「${file}」标记为私有（private: true），但没有配置加密口令。` +
              `请在项目根目录的 .env.local 里设置 PRIVATE_POST_PASSWORD=你的口令（该文件已被 .gitignore 忽略）；` +
              `本地只看不加密的预览请用 usertools\\local-run.ps1（它会设置 SKIP_ENCRYPT=true）。`
          );
        }
        encrypted = encryptHtml(blocksToHtml(blocks), password);
        finalBlocks = [];
      }

      return {
        slug,
        title: str(data.title, path.basename(file, ".md")),
        date: str(data.date, "1970-01-01"),
        category,
        excerpt: str(data.excerpt, ""),
        tags,
        pdf: str(data.pdf, "") || undefined,
        private: isPrivate,
        encrypted,
        content: finalBlocks,
      };
    });
}

/** 构建期汇总提示：本地预览模式下有私有文章时提醒一次（防止把明文产物对外发布） */
function warnPreview(all: Post[]): Post[] {
  if (!warnedSkipEncrypt && isEncryptSkipped()) {
    const locked = all.filter((p) => p.private);
    if (locked.length > 0) {
      warnedSkipEncrypt = true;
      console.warn(
        `\n[posts] ⚠ SKIP_ENCRYPT=true：${locked.length} 篇私有文章以【明文】构建（` +
          locked.map((p) => p.slug).join(", ") +
          `）。\n        这是本地预览模式，产物不要对外发布；正式部署请去掉 SKIP_ENCRYPT 并配置 PRIVATE_POST_PASSWORD。\n`
      );
    }
  }
  return all;
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
  return warnPreview(loadAllPosts().sort((a, b) => (a.date < b.date ? 1 : -1)));
}

/** 全部文章的摘要（不含正文 / 密文，可安全序列化给客户端组件） */
export function getAllPostSummaries(): PostSummary[] {
  return getAllPosts().map(toSummary);
}

/** 文章页分组：按分类返回各 tab（顺序固定：研究、工程、生活），每组按日期倒序 */
export function getPostsGrouped(): { name: PostCategory; posts: Post[] }[] {
  const all = getAllPosts();
  return POST_CATEGORIES.map((name) => ({
    name,
    posts: all.filter((p) => p.category === name),
  }));
}

/** 构建期是否处于“本地预览不加密”模式（供页面显示提示条） */
export function isPrivatePreview(): boolean {
  return isEncryptSkipped();
}

/** 根据 slug 找单篇文章，找不到返回 undefined */
export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
