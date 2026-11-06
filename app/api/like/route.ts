// ============================================================
// 文章点赞 / 表情反应接口（计划 3.4 点赞 · 3.6 多表情 · 3.5 卡片赞数）
//   GET  /api/like  → 全部文章的计数 + 这位访客自己点过的（一次拿全，列表页只发一个请求）
//   POST /api/like  → { slug, kind } 切换（再点一次取消），返回该篇的权威计数
//
// 与 /api/stats 同一套硬约束：force-dynamic、客户端拉取、不碰 lib/posts.ts。
// slug 必须命中构建期清单（lib/postIndex.ts）——否则任何访客都能写任意 key 把库撑爆（§3.4）。
// ============================================================
import { NextResponse } from "next/server";
import { visitorFromHeaders } from "@/lib/analytics";
import { isKnownSlug } from "@/lib/postIndex";
import {
  allReactionCounts,
  isReactionKind,
  myReactions,
  slugReactionCounts,
  toggleReaction,
} from "@/lib/reactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function fail(reason: string, status = 503) {
  return NextResponse.json({ ok: false, error: reason }, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  try {
    const visitor = visitorFromHeaders(request.headers);
    return NextResponse.json(
      {
        ok: true,
        counts: allReactionCounts(),
        mine: myReactions(visitor),
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("[api/like] GET 失败：", err);
    return fail("reactions unavailable");
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
    const payload = (body ?? {}) as { slug?: unknown; kind?: unknown };

    if (!isKnownSlug(payload.slug)) {
      // 白名单外一律拒绝：不存在的 slug 既不写库也不泄漏"哪些 slug 存在"
      return fail("unknown slug", 400);
    }
    if (!isReactionKind(payload.kind)) {
      return fail("unknown kind", 400);
    }

    const visitor = visitorFromHeaders(request.headers);
    const { added } = toggleReaction(payload.slug, payload.kind, visitor);

    return NextResponse.json(
      {
        ok: true,
        slug: payload.slug,
        kind: payload.kind,
        added,
        // 回传权威计数，前端用它覆盖乐观更新的结果
        counts: slugReactionCounts(payload.slug),
        mine: myReactions(visitor).filter((key) => key.startsWith(`${payload.slug}|`)),
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("[api/like] POST 失败：", err);
    return fail("reactions unavailable");
  }
}
