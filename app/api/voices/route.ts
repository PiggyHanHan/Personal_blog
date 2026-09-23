import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 枚举录音目录(public/hutao/使用中/录音/)下的音频文件,返回 URL 编码后的文件名列表。
// 用户往目录里放任意命名的 wav/mp3 都会自动纳入"点胡桃随机播放"的池子,无需改代码。
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dir = path.join(
      process.cwd(),
      "public",
      "hutao",
      "使用中",
      "录音"
    );
    const files = fs.readdirSync(dir).filter((f) => /\.(wav|mp3)$/i.test(f));
    const names = files.map((f) => encodeURIComponent(f));
    return NextResponse.json({ voices: names });
  } catch {
    return NextResponse.json({ voices: [] });
  }
}
