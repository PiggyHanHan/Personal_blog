// ============================================================
// 文章静态清单（构建期生成，运行期只读）
//
// 数据源：scripts/gen-post-index.mjs 在 `npm run prebuild` / `predev` 时写出的
//         data/post-index.json —— 只含 slug / title / date / private。
//
// 为什么不在 API 路由里直接读 Markdown（计划文档 §0.1 第 6 条）：
//   全量解析 25 篇文章 ≈ 4 秒，其中每篇私有文章要跑一次 25 万次迭代的 PBKDF2。
//   互动接口是**每个访客都会打**的，绝不能把这条链路引进请求路径。
//
// 兜底：清单文件缺失时（忘了跑构建、手工清了 data/），退化成只扫 frontmatter 的轻量解析——
//   仍然不碰正文、不做加密，毫秒级，行为与正式清单一致。缺文件会打一条警告。
// ============================================================
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export type PostIndexEntry = {
  slug: string;
  title: string;
  date: string;
  /** 私有文章（frontmatter private: true 或 private/私有/加密 tag） */
  private: boolean;
};

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, "data", "post-index.json");
const POSTS_DIR = path.join(ROOT, "content", "posts");

/** 与 lib/posts.ts 的校验规则一致 */
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
/** 与 lib/posts.ts 一致：写了这些 tag 等同于 private: true */
const PRIVATE_TAGS = /^(private|私有|加密)$/i;

let cache: Map<string, PostIndexEntry> | null = null;
let warnedMissing = false;

/** 读构建期清单；文件不存在 / 解析失败 → null */
function readGeneratedIndex(): Map<string, PostIndexEntry> | null {
  try {
    if (!existsSync(INDEX_FILE)) return null;
    const parsed = JSON.parse(readFileSync(INDEX_FILE, "utf8")) as {
      posts?: PostIndexEntry[];
    };
    if (!Array.isArray(parsed.posts)) return null;
    const map = new Map<string, PostIndexEntry>();
    for (const post of parsed.posts) {
      if (post && typeof post.slug === "string" && SLUG_RE.test(post.slug)) {
        map.set(post.slug, {
          slug: post.slug,
          title: typeof post.title === "string" ? post.title : post.slug,
          date: typeof post.date === "string" ? post.date : "1970-01-01",
          private: post.private === true,
        });
      }
    }
    return map;
  } catch (err) {
    console.warn("[postIndex] data/post-index.json 读取失败，改用 frontmatter 兜底：", err);
    return null;
  }
}

/**
 * 兜底：只切 frontmatter 文本，不解析正文、不跑 remark / 加密。
 * 宁可慢一点点，也不能让"忘了重新构建"直接把点赞功能打成 500。
 */
function scanFrontmatter(): Map<string, PostIndexEntry> {
  const map = new Map<string, PostIndexEntry>();
  let files: string[] = [];
  try {
    files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return map;
  }
  for (const file of files) {
    let head = "";
    try {
      const raw = readFileSync(path.join(POSTS_DIR, file), "utf8");
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
      head = match ? match[1] : "";
    } catch {
      continue;
    }
    const slugMatch = /^slug:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m.exec(head);
    const slug = slugMatch ? slugMatch[1] : path.basename(file, ".md");
    if (!SLUG_RE.test(slug)) continue;

    const titleMatch = /^title:\s*["']?(.+?)["']?\s*$/m.exec(head);
    const dateMatch = /^date:\s*["']?([0-9]{4}-[0-9]{2}-[0-9]{2})/m.exec(head);
    // 私有判定：private: true，或 tags 行里出现 private / 私有 / 加密
    const tagsLine = /^(?:tags|tag):\s*(.+)$/m.exec(head)?.[1] ?? "";
    const isPrivate =
      /^private:\s*(true|yes|1)\s*$/im.test(head) ||
      tagsLine
        .split(/[,[\]]/)
        .map((t) => t.trim().replace(/^["']|["']$/g, ""))
        .some((t) => PRIVATE_TAGS.test(t));

    map.set(slug, {
      slug,
      title: titleMatch ? titleMatch[1] : slug,
      date: dateMatch ? dateMatch[1] : "1970-01-01",
      private: isPrivate,
    });
  }
  return map;
}

/**
 * 全部文章的静态清单（slug → 条目）。
 * dev 下不缓存（改了 md 重跑 predev 立刻见效）；生产构建 / 服务进程缓存一份。
 */
export function getPostIndex(): Map<string, PostIndexEntry> {
  if (process.env.NODE_ENV === "development") {
    return readGeneratedIndex() ?? scanFrontmatter();
  }
  if (cache) return cache;
  const generated = readGeneratedIndex();
  if (generated) {
    cache = generated;
    return cache;
  }
  if (!warnedMissing) {
    warnedMissing = true;
    console.warn(
      "[postIndex] 没有 data/post-index.json（应随 `npm run build` 的 prebuild 生成），" +
        "已退化为扫描 content/posts/ 的 frontmatter。跑一次 `node scripts/gen-post-index.mjs` 即可恢复。"
    );
  }
  cache = scanFrontmatter();
  return cache;
}

/** slug 是否属于真实存在的文章（点赞 / 访客上报的**白名单校验**） */
export function isKnownSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 120) return false;
  return getPostIndex().has(slug);
}

/** slug 是否为私有文章（私有文章不进公开榜单，见 §0.6 D5 的默认口径） */
export function isPrivateSlug(slug: string): boolean {
  return getPostIndex().get(slug)?.private === true;
}

/** 全部公开文章的 slug（公开统计接口只返回这些） */
export function getPublicSlugs(): string[] {
  return [...getPostIndex().values()]
    .filter((entry) => !entry.private)
    .map((entry) => entry.slug);
}
