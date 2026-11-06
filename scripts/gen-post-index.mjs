// ============================================================
// 构建期生成「文章静态清单」→ data/post-index.json
//
// 为什么必须有它（计划文档 §0.1 第 6 条）：
//   互动 API（访客上报 / 点赞 / 表情）必须校验 slug 白名单，否则任何人都能往库里写任意 key。
//   而 API 路由里**绝不能**调 getAllPosts()：那会触发全量 Markdown 解析，其中每篇私有文章
//   还要现跑一次 25 万次 PBKDF2——一个请求就能把进程拖住好几秒。
//   所以清单在构建期算好，运行期只读一个几 KB 的 JSON。
//
// 这里只读 frontmatter（gray-matter），不解析正文、不做加密，毫秒级完成。
// 产物落在 data/：该目录**不在部署包白名单里**（usertools/deploy-light.ps1），
// 也不会被部署脚本删除，线上数据不会被本地空目录覆盖。
// ============================================================
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const OUT_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(OUT_DIR, "post-index.json");

/** 与 lib/posts.ts 完全一致的 slug 规则（中文 slug 会导致详情页 404，构建时就会报错） */
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
/** 与 lib/posts.ts 一致：写了这些 tag 等同于 private: true */
const PRIVATE_TAGS = new Set(["private", "私有", "加密"]);

/** YAML 裸日期会被 gray-matter 解析成 Date，按本地时间拼 YYYY-MM-DD（不能走 toISOString，会差一天） */
function toDateString(value, fallback) {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return fallback;
}

function build() {
  let files = [];
  try {
    files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    console.warn("[post-index] 找不到 content/posts/，生成空清单");
  }

  const posts = [];
  for (const file of files.sort()) {
    const raw = readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data } = matter(raw);
    const slug =
      typeof data.slug === "string" && data.slug.trim() !== ""
        ? data.slug.trim()
        : path.basename(file, ".md");
    if (!SLUG_RE.test(slug)) {
      // 不在这里抛错：lib/posts.ts 才是权威校验处，它报的错更详细（会打印修复模板）
      console.warn(`[post-index] 跳过 slug 非法的文章「${file}」（slug=${slug}）`);
      continue;
    }
    const tags = Array.isArray(data.tags)
      ? data.tags.filter((t) => typeof t === "string")
      : [];
    const isPrivate =
      data.private === true ||
      String(data.private).toLowerCase() === "true" ||
      tags.some((t) => PRIVATE_TAGS.has(t.trim().toLowerCase()));

    posts.push({
      slug,
      // 标题 / 日期只用于将来的面板（3.2 / 1.13），互动接口本身只关心 slug 与 private
      title: typeof data.title === "string" ? data.title : path.basename(file, ".md"),
      date: toDateString(data.date, "1970-01-01"),
      private: isPrivate,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT_FILE,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), count: posts.length, posts },
      null,
      2
    ) + "\n",
    "utf8"
  );
  const locked = posts.filter((p) => p.private).length;
  console.log(
    `[post-index] 写入 ${path.relative(ROOT, OUT_FILE)}：${posts.length} 篇（其中私有 ${locked} 篇）`
  );
}

build();
