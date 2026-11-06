// ============================================================
// 访客统计接口（计划 3.1）
//   GET  /api/stats  → 只读统计（站点累计 PV / 今日 UV / 你是第 N 位）+ 每篇公开文章的浏览量
//   POST /api/stats  → 上报一次页面浏览 { path }，返回同样的统计
//
// 硬约束（§0.1）：
//   · `force-dynamic`：这是实时计数，**绝不能被构建期预渲染成静态响应**（Next 15 默认会这么做）。
//   · 页面组件不碰这些数据，全部由客户端 hydrate 后拉取，`/posts` 才能保持 ○。
//   · 不 import lib/posts.ts：slug 白名单走构建期清单（lib/postIndex.ts），请求里零 Markdown 解析。
// ============================================================
import { NextResponse } from "next/server";
import {
  clientIp,
  publicViewCounts,
  readStats,
  recordVisit,
  visitorHash,
} from "@/lib/analytics";
import { isKnownSlug } from "@/lib/postIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 路径白名单化：必须是站内绝对路径，且长度有限（客户端可以传任意值，别信） */
function normalizePath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const path = input.split(/[?#]/)[0];
  if (!path.startsWith("/") || path.length > 300) return null;
  return path;
}

/** 从路径推导文章 slug：/posts/<slug> → <slug>，且必须在构建期清单里 */
function slugFromPath(path: string): string | null {
  const match = /^\/posts\/([^/]+)\/?$/.exec(path);
  if (!match) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return isKnownSlug(slug) ? slug : null;
}

function fail(reason: string, status = 503) {
  return NextResponse.json(
    { ok: false, error: reason },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: Request) {
  try {
    const headers = request.headers;
    const visitor = visitorHash(clientIp(headers), headers.get("user-agent") ?? "");
    return NextResponse.json(
      { ok: true, ...readStats(visitor), posts: publicViewCounts() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/stats] GET 失败：", err);
    return fail("stats unavailable");
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const path = normalizePath((body as { path?: unknown } | null)?.path);
    if (!path) {
      return fail("bad path", 400);
    }

    const headers = request.headers;
    const stats = recordVisit({
      path,
      slug: slugFromPath(path),
      ip: clientIp(headers),
      ua: headers.get("user-agent") ?? "",
    });

    return NextResponse.json(
      { ok: true, ...stats, posts: publicViewCounts() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    // 统计坏掉绝不能影响阅读：只回一个安静的失败，客户端保持静默
    console.error("[api/stats] POST 失败：", err);
    return fail("stats unavailable");
  }
}
