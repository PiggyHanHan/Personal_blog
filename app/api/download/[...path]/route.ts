// ============================================================
// 文件下载接口：/api/download/<content/files 下的相对路径>
// 例如 /api/download/我的论文.pdf → 强制下载 content/files/我的论文.pdf
// 作用：让"下载 PDF"链接真正触发浏览器下载（而不是打开预览）。
// ============================================================
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (!segments.length) {
    return new NextResponse("缺少文件名", { status: 400 });
  }

  const relative = segments.join("/");
  const filesRoot = path.join(process.cwd(), "content", "files");
  const full = path.resolve(filesRoot, relative);

  // 防路径穿越：只允许 content/files/ 下的文件
  if (!full.startsWith(filesRoot + path.sep)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  if (!existsSync(full)) {
    return new NextResponse("文件不存在", { status: 404 });
  }

  const data = readFileSync(full);
  const filename = path.basename(relative);
  // RFC 5987：中文文件名在 Content-Disposition 中正确编码
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      "Content-Length": String(data.length),
    },
  });
}
