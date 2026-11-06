// ============================================================
// 文章互动计数（计划 3.4 点赞 / 3.6 多表情反应 / 3.5 卡片赞数）
//
// 存储：SQLite 的 reactions 表，主键 (slug, kind, visitor) —— 天然保证"同一访客同一表情只算一次"。
// 白名单：slug 必须存在于构建期清单（lib/postIndex.ts），否则任何人都能写任意 key 把库撑爆
//         （§3.4 明确要求；清单里绝不触发 Markdown 解析 / PBKDF2）。
// 幂等：POST 是**切换**（再点一次取消），既避免误点，也不用前端记状态。
// ============================================================
import { getDb } from "./db";
import { REACTIONS, type ReactionKind } from "./site";

/** slug → kind → 计数 */
export type ReactionCounts = Record<string, Partial<Record<ReactionKind, number>>>;

const KINDS: ReactionKind[] = REACTIONS.kinds.map((item) => item.key);

/** kind 是否合法（只认前端暴露的这几个，防止往库里塞垃圾列） */
export function isReactionKind(value: unknown): value is ReactionKind {
  return typeof value === "string" && (KINDS as string[]).includes(value);
}

/** 全部文章的互动计数（列表页卡片用；一次请求拿全量，避免 N 个卡片 N 次请求） */
export function allReactionCounts(): ReactionCounts {
  const rows = getDb()
    .prepare("SELECT slug, kind, COUNT(*) AS n FROM reactions GROUP BY slug, kind")
    .all() as { slug?: string; kind?: string; n?: number }[];

  const counts: ReactionCounts = {};
  for (const row of rows) {
    const slug = typeof row.slug === "string" ? row.slug : "";
    const kind = row.kind;
    if (slug === "" || !isReactionKind(kind)) continue;
    const bucket = counts[slug] ?? {};
    bucket[kind] = Number(row.n ?? 0);
    counts[slug] = bucket;
  }
  return counts;
}

/** 单篇的互动计数（详情页 POST 后回传权威值） */
export function slugReactionCounts(slug: string): Partial<Record<ReactionKind, number>> {
  const rows = getDb()
    .prepare("SELECT kind, COUNT(*) AS n FROM reactions WHERE slug = ? GROUP BY kind")
    .all(slug) as { kind?: string; n?: number }[];

  const counts: Partial<Record<ReactionKind, number>> = {};
  for (const row of rows) {
    if (!isReactionKind(row.kind)) continue;
    counts[row.kind] = Number(row.n ?? 0);
  }
  return counts;
}

/** 这位访客自己点过的（返回 "slug|kind" 列表；只是他自己的数据，不含任何他人信息） */
export function myReactions(visitor: string): string[] {
  if (!visitor) return [];
  const rows = getDb()
    .prepare("SELECT slug, kind FROM reactions WHERE visitor = ?")
    .all(visitor) as { slug?: string; kind?: string }[];
  return rows
    .filter((row) => typeof row.slug === "string" && isReactionKind(row.kind))
    .map((row) => `${row.slug}|${row.kind as string}`);
}

/** 切换一个表情：已点过就取消，没点过就记上 */
export function toggleReaction(
  slug: string,
  kind: ReactionKind,
  visitor: string
): { added: boolean } {
  const instance = getDb();
  const existing = instance
    .prepare("SELECT 1 AS hit FROM reactions WHERE slug = ? AND kind = ? AND visitor = ?")
    .get(slug, kind, visitor);

  if (existing !== undefined) {
    instance
      .prepare("DELETE FROM reactions WHERE slug = ? AND kind = ? AND visitor = ?")
      .run(slug, kind, visitor);
    return { added: false };
  }

  instance
    .prepare("INSERT INTO reactions (slug, kind, visitor, ts) VALUES (?, ?, ?, ?)")
    .run(slug, kind, visitor, Date.now());
  return { added: true };
}
