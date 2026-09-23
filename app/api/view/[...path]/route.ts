// ============================================================
// 文件预览接口：/api/view/<content/files 下的相对路径>
// 例如 /api/view/我的论文.pdf → 内联返回 PDF（Content-Disposition: inline）
// 作用：让"新窗口打开"和 iframe 在浏览器里真正预览 PDF，而不是触发下载。
// （/files/ 下的静态文件由 Nginx 直接托管（见启动服务器指南），这里统一走
//   本接口以声明 inline，部分浏览器/手机把顶层导航或 iframe 里的 PDF 当成
//   下载处理时也能正常预览。）
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
      // inline：浏览器内嵌/直接显示，不触发下载
      "Content-Disposition": `inline; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      "Content-Length": String(data.length),
    },
  });
}
