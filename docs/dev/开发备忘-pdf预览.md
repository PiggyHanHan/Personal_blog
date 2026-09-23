# 开发备忘：手机端 PDF 预览（pdf.js）

> 2026-08-11 实现。给之后接手开发的人看，避免重踩坑。
> 面向使用者的说明见《内容更新指南.md》的「放 PDF / 附件」一节。

## 现状

- 详情页 PDF 预览：**桌面用原生 iframe**（`PdfPreview.tsx`），**手机/触屏设备用 pdf.js 渲染**（`MobilePdfViewer.tsx`，canvas 画出来，小米/微信等国产 WebView 也能看）。
- 预览统一走 `/api/view/<相对路径>`（`Content-Disposition: inline`，浏览器内嵌显示、不下载）；「新窗口打开」按钮指向同一接口。
- 下载入口在文章正文的 `/files/*.pdf` 链接，预览区没有下载按钮。

## 关键坑（都已解决，改的时候别改回去）

1. **手机端绝不能渲染 iframe**——即使 CSS `display:none`，iframe 仍会加载 PDF，iOS/小米浏览器会弹下载。所以 `PdfPreview` 用客户端 state 决定：初始 `null`（SSR/首帧不渲染任何 PDF 内容），mount 后判定。
2. **移动端判断不能用视口宽度**：iPad、折叠屏、浏览器「电脑模式」会伪装宽屏/桌面 UA。用 `UA 正则 || matchMedia("(pointer: coarse)") || navigator.maxTouchPoints > 0`——触屏能力绕不过去。
3. **`pdfjs-dist` 必须动态 `import("pdfjs-dist")`**：它的浏览器构建在 Node 环境（SSR 预渲染）下缺 `DOMMatrix`，静态 import 会让 `next build` 崩。类型用 `import type * as PdfJs from "pdfjs-dist"`。
4. **worker 加载**：`new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()`（webpack asset 方式；Next.js 不认 `?url` 导入 `.mjs`）。设到 `GlobalWorkerOptions.workerSrc`。
5. **pdfjs v6 API 变化**：`page.render({ canvas, viewport })`（不是 `canvasContext`）；销毁用 `loadingTask.destroy()`（`PDFDocumentProxy.destroy` 已移除）。
6. 滚动懒渲染：先渲染前 3 页，滚到底部（`scrollTop + clientHeight >= scrollHeight - 300`）再渲染下一页；scale 按容器宽度自适应，上限 2 倍防大 canvas 撑爆内存。

## 依赖

- `pdfjs-dist@6.2.108`（`npm.cmd install`，本机 npm 被 0 字节空文件劫持）
