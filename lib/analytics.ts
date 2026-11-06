// ============================================================
// 访客统计（计划文档 3.1）
//
// 隐私口径（写死在实现里，别随手改）：
//   · **IP 绝不落库**。只存 sha256(ip + ua + salt + 当天) 的前 32 位十六进制（= §0.3 要求的 UV 算法）。
//   · 盐在数据库的 meta 表里随机生成（lib/db.ts），不进 Git、不进部署包、不下发浏览器。
//   · 不写 Cookie、不做跨站标识；换一天就是另一个哈希，无法长期跟踪同一个人。
//
// 真实 IP（⚠️ 与计划文档 §3.1 的字面写法不同，这里是**测过 nginx 行为后**的正确版本）：
//   usertools/nginx-blog.conf 里：
//     X-Real-IP        $remote_addr                ← nginx 覆盖写，客户端伪造不了
//     X-Forwarded-For  $proxy_add_x_forwarded_for  ← **追加**语义：客户端自带的 XFF 在前，nginx 追加的真实地址在最后
//   → 只用 X-Real-IP；没有它时取 XFF 的**最后一段**。
//   ⚠️ 计划文档写的"XFF 首段兜底"是反的：首段完全由访客自己填，
//      一行 `curl -H "X-Forwarded-For: $(random)"` 就能把自己伪装成无数新访客、
//      把"第 N 位访客"和 UV 刷到天上。末段才是 nginx 追加的、可信的那个。
// ============================================================
import { createHash } from "node:crypto";
import { getDb, getVisitorSalt } from "./db";
import { getPublicSlugs } from "./postIndex";

/**
 * 访客统计的四个数（2026-10-11 按验收意见改成结构化：
 * 原来的"你是第 N 位"与"累计翻阅"都没说清是今天还是历史，展示上有歧义）。
 *
 *   today.visitors  今日来访旅人：按天去重的访客数（当前这位已计入 → 就是"今日第 N 位"的 N）
 *   today.views     今日翻阅次数：今天记录到的页面浏览条数
 *   total.visitors  历史来访旅人：**按「访客·天」去重**（哈希里带了日期，同一个人不同天各算一位）
 *   total.views     历史翻阅次数：累计页面浏览条数
 */
export type SiteStats = {
  today: { visitors: number; views: number };
  total: { visitors: number; views: number };
  /** 本次请求的这位访客今天是否第一次来 */
  isNewToday: boolean;
};

/** 站点时区固定为北京时间（服务器在 UTC，直接用本地时间会差 8 小时、把凌晨的访问算到前一天） */
const TZ_OFFSET_MS = 8 * 3600 * 1000;

/** 北京时间日期键 YYYY-MM-DD */
export function dayKey(ts: number = Date.now()): string {
  return new Date(ts + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** 真实客户端 IP（见文件头说明：只信 nginx 覆盖 / 追加过的头） */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  // 直连 3000 端口（本地调试 / 健康检查）没有代理头：同一台机器算同一个人，够用
  return "unknown";
}

/** §0.3 规定的 UV 算法：sha256(ip + ua + salt + 日期)，只留前 32 位 */
export function visitorHash(ip: string, ua: string, ts: number = Date.now()): string {
  return createHash("sha256")
    .update(`${ip}\u0000${ua}\u0000${getVisitorSalt()}\u0000${dayKey(ts)}`)
    .digest("hex")
    .slice(0, 32);
}

/** 上报接口用：从请求头算出这位访客的匿名 ID（IP 用完即弃，不落库） */
export function visitorFromHeaders(headers: Headers): string {
  return visitorHash(clientIp(headers), headers.get("user-agent") ?? "");
}

/**
 * 短期去重：同一访客 + 同一路径，10 秒内只记一次 PV。
 * 挡的是"刷新键连点"和 React 开发模式的双次 effect；正常阅读不受影响（翻页路径不同）。
 */
const RECENT_WINDOW_MS = 10_000;
const RECENT_MAX = 5000;
const recent = new Map<string, number>();

function isDuplicate(visitor: string, path: string, now: number): boolean {
  const key = `${visitor}\u0000${path}`;
  const last = recent.get(key);
  if (last !== undefined && now - last < RECENT_WINDOW_MS) return true;
  if (recent.size >= RECENT_MAX) recent.clear();
  recent.set(key, now);
  return false;
}

function count(instance: ReturnType<typeof getDb>, sql: string, ...params: string[]): number {
  const row = instance.prepare(sql).get(...params) as { n?: number } | undefined;
  return Number(row?.n ?? 0);
}

function totals(instance: ReturnType<typeof getDb>): Omit<SiteStats, "isNewToday"> {
  const today = dayKey();
  return {
    today: {
      // 今日来访旅人（按天去重；当前这位已经写库了，所以这个数就是"今日第 N 位"的 N）
      visitors: count(
        instance,
        "SELECT COUNT(DISTINCT visitor) AS n FROM visits WHERE day = ?",
        today
      ),
      views: count(instance, "SELECT COUNT(*) AS n FROM visits WHERE day = ?", today),
    },
    total: {
      // 哈希里带了日期，所以"去重访客数"天然等于「去重访客·日数」：
      // 同一个人第二天再来会算新的一位 —— 不做长期跟踪的代价，展示时用 tooltip 说明。
      visitors: count(instance, "SELECT COUNT(DISTINCT visitor) AS n FROM visits"),
      views: count(instance, "SELECT COUNT(*) AS n FROM visits"),
    },
  };
}

/** 记录一次页面浏览，返回最新统计 */
export function recordVisit(opts: {
  /** 归一化后的路径（不含查询串），例如 /posts/hello-world */
  path: string;
  /** 文章 slug（不是文章页则为 null）——由服务端从路径 + 白名单推导，不信客户端 */
  slug: string | null;
  ip: string;
  ua: string;
}): SiteStats {
  const instance = getDb();
  const now = Date.now();
  const visitor = visitorHash(opts.ip, opts.ua, now);

  const seen = instance
    .prepare("SELECT 1 AS hit FROM visits WHERE visitor = ? LIMIT 1")
    .get(visitor);
  const isNewToday = seen === undefined;

  if (!isDuplicate(visitor, opts.path, now)) {
    instance
      .prepare(
        "INSERT INTO visits (ts, day, path, slug, visitor, ua) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(now, dayKey(now), opts.path, opts.slug, visitor, opts.ua.slice(0, 200));
  }

  return { ...totals(instance), isNewToday };
}

/** 只读统计（GET /api/stats；不产生 PV） */
export function readStats(visitor?: string): SiteStats {
  const instance = getDb();
  const base = totals(instance);
  let isNewToday = false;
  if (visitor) {
    const today = dayKey();
    const seen = instance
      .prepare("SELECT 1 AS hit FROM visits WHERE visitor = ? AND day = ? LIMIT 1")
      .get(visitor, today);
    isNewToday = seen === undefined;
  }
  return { ...base, isNewToday };
}

/**
 * 每篇**公开**文章的浏览量。
 * 私有文章的浏览照常记录（只有站主能在面板里看），但不进公开接口——见 §0.6 D5。
 */
export function publicViewCounts(): Record<string, number> {
  const instance = getDb();
  const rows = instance
    .prepare(
      "SELECT slug, COUNT(*) AS n FROM visits WHERE slug IS NOT NULL GROUP BY slug"
    )
    .all() as { slug?: string; n?: number }[];

  const allowed = new Set(getPublicSlugs());
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const slug = typeof row.slug === "string" ? row.slug : "";
    if (!allowed.has(slug)) continue;
    counts[slug] = Number(row.n ?? 0);
  }
  return counts;
}
