// ============================================================
// 博客更新日志（访客版）：读取 content/changelog/ 下每天一个 Markdown 文件。
// 加新日志：在 content/changelog/ 下新建 <日期>.md（最新在前由日期倒序保证），
// frontmatter 写元信息：
//   ---
//   title: 当天日志标题
//   date: 2026-08-11        # YYYY-MM-DD（同时决定 slug 与排序）
//   excerpt: 列表卡片摘要
//   ---
// 正文写当天更新（只写访客能感知的功能更新 / 修复，不写技术内部细节）。
// 文件名须为 YYYY-MM-DD（与 date 一致）；此模块仅在服务端组件中使用，
// 改内容后需重新构建。
// ============================================================
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { markdownToBlocks } from "./markdown";
import type { Block } from "./posts";

/** 一天的更新日志 */
export type ChangelogEntry = {
  /** 链接标识 = 日期，例如 2026-08-11 → /changelog/2026-08-11 */
  slug: string;
  /** 当天日志标题 */
  title: string;
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 列表卡片摘要 */
  excerpt: string;
  /** 正文：块级结构（与文章一致） */
  content: Block[];
};

const CHANGELOG_DIR = path.join(process.cwd(), "content", "changelog");

function loadAllChangelog(): ChangelogEntry[] {
  if (!existsSync(CHANGELOG_DIR)) return [];
  return readdirSync(CHANGELOG_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = readFileSync(path.join(CHANGELOG_DIR, file), "utf8");
      const { data, content } = matter(raw);
      // 链接标识 = 文件名（<日期>.md）
      const slug = str(data.date, path.basename(file, ".md"));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(slug)) {
        throw new Error(
          `[changelog] 日志文件「${file}」的 date「${slug}」必须是 YYYY-MM-DD 格式（同时作为链接标识）。`
        );
      }
      return {
        slug,
        title: str(data.title, slug),
        date: slug,
        excerpt: str(data.excerpt, ""),
        content: markdownToBlocks(content),
      };
    });
}

function str(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim() !== "") return value;
  // YAML 会把裸日期（如 2026-08-11）解析成 Date 对象
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return fallback;
}

/** 全部更新日志，按日期倒序（最新在前） */
export function getChangelogEntries(): ChangelogEntry[] {
  return loadAllChangelog().sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 最近一次日志（关于页顶部预览用），无日志时返回 undefined */
export function getLatestChangelog(): ChangelogEntry | undefined {
  return getChangelogEntries()[0];
}

/** 按日期找某一天的日志，找不到返回 undefined */
export function getChangelogBySlug(slug: string): ChangelogEntry | undefined {
  return getChangelogEntries().find((e) => e.slug === slug);
}
