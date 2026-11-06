import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ============================================================
// 胡桃语音池枚举（计划 9.1）
//
//   点开屏那张 Q 版胡桃 → pool=hutao（默认，不带参数也是它）
//   点侧边栏那枚神之眼 → pool=vision
//
// 两个池子就是 public/theme/voice/ 下的两个目录 —— 往目录里丢音频文件就自动进池子，
// 不用改代码。**放在 public/theme/ 是为了能跟着代码部署**：public/hutao/ 不在部署包白名单里
// （AGENTS.md §0.4），往里加新文件不会同步到服务器。
//
// 约定：**文件名以 `_` 开头的不进随机池**（比如 _greeting-你很有眼光嘛！.mp3 是"开门欢迎语"，
// 由 SOUND_CANDIDATES 定点播放，不该混进随机里重复出现）。
// ============================================================

/** 池子 → 目录（加池子：这里加一行，前端 VoicePool 类型同步加一个） */
const POOLS = {
  hutao: "theme/voice/hutao",
  vision: "theme/voice/vision",
} as const;

type PoolName = keyof typeof POOLS;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("pool") ?? "hutao";
  const pool: PoolName = requested in POOLS ? (requested as PoolName) : "hutao";
  const dir = POOLS[pool];

  try {
    const files = fs
      .readdirSync(path.join(process.cwd(), "public", dir))
      .filter((f) => /\.(mp3|wav|m4a|ogg)$/i.test(f) && !f.startsWith("_"))
      .sort();
    return NextResponse.json({
      pool,
      /** 前端据此拼 URL，别在客户端硬编码目录 */
      dir: `/${dir}`,
      voices: files.map((f) => encodeURIComponent(f)),
    });
  } catch {
    // 目录不存在（比如刚部署还没放音频）：回空池，前端静默跳过
    return NextResponse.json({ pool, dir: `/${dir}`, voices: [] });
  }
}
