"use client";

import { useEffect, useRef, useState } from "react";
import type * as PdfJs from "pdfjs-dist";

// pdf.js worker：用 new URL(..., import.meta.url) 让 webpack 把它作为静态资源输出
// （Next.js 不认 `?url` 导入 .mjs）。worker 是单文件 bundle，可被 new Worker 直接加载。
// 用 legacy build：pdfjs v6 主构建要求很新的浏览器（module worker / ES2022+），
// 小米等老内核手机浏览器跑不动，legacy 版是转译过的（ES2017），兼容性最广。
const workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type Status = "loading" | "ready" | "error";

// 手机端 PDF 渲染：用 pdf.js 把 PDF 画成 canvas，不依赖浏览器原生 PDF 支持，
// 小米/微信等国产 WebView 也能直接看。首次加载较慢（文档解析 + 逐页渲染），
// 采用滚动懒加载：先渲染前 3 页，滚到底部再继续。
//
// 注意：pdfjs-dist 必须动态 import（只在浏览器端执行）——它的浏览器构建在 Node
// 环境（SSR 预渲染）下会因缺少 DOMMatrix 报错，所以不能静态 import。
export default function MobilePdfViewer({ src }: { src: string }) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PdfJs.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PdfJs.PDFDocumentLoadingTask | null>(null);
  const nextPageRef = useRef(1); // 下一页要渲染的页码
  const [pdfjs, setPdfjs] = useState<typeof PdfJs | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [pageCount, setPageCount] = useState(0);
  const [rendered, setRendered] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 浏览器端动态加载 pdf.js（legacy build，兼容老手机浏览器）
  useEffect(() => {
    let cancelled = false;
    import("pdfjs-dist/legacy/build/pdf.min.mjs").then((lib) => {
      if (cancelled) return;
      lib.GlobalWorkerOptions.workerSrc = workerSrc;
      setPdfjs(lib);
    }).catch((err) => {
      if (cancelled) return;
      setErrorMsg(
        err instanceof Error ? err.message : String(err)
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pdfjs) return; // 等 pdf.js 加载完成
    const lib = pdfjs; // 嵌套函数里 TS 无法收窄 state，这里固定引用
    let cancelled = false;
    const container = pagesRef.current;
    if (!container) return;

    async function renderNext() {
      const doc = docRef.current;
      const c = pagesRef.current;
      if (!doc || !c) return;
      const n = nextPageRef.current;
      if (n > doc.numPages) return;
      nextPageRef.current = n + 1;
      try {
        const page = await doc.getPage(n);
        // 按容器宽度自适应缩放（上限 2 倍，避免超大 canvas 撑爆内存）
        const base = page.getViewport({ scale: 1 });
        const avail = Math.max(c.clientWidth - 12, 240);
        const scale = Math.min(2, avail / base.width);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.className = "mobile-pdf__page";
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        c.appendChild(canvas);
        await page.render({ canvas, viewport }).promise;
        if (cancelled) return;
        setRendered(n);
      } catch {
        // 单页渲染失败跳过，不整体报错
      }
    }

    async function load() {
      try {
        // 8.7MB PDF 经隧道传输在手机上可能很慢，加 45s 超时避免无限挂起
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        let data: ArrayBuffer;
        try {
          const resp = await fetch(src, { signal: controller.signal });
          if (!resp.ok) throw new Error(`下载失败（HTTP ${resp.status}）`);
          data = await resp.arrayBuffer();
        } finally {
          clearTimeout(timeout);
        }
        const loadingTask = lib.getDocument({ data });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) return;
        docRef.current = doc;
        setPageCount(doc.numPages);
        setStatus("ready");
        // 先渲染前 3 页，其余靠滚动懒加载
        for (let i = 0; i < 3 && nextPageRef.current <= doc.numPages; i++) {
          await renderNext();
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(
            err instanceof DOMException && err.name === "AbortError"
              ? "下载超时：网络较慢，请稍后重试或点「新窗口打开」"
              : err instanceof Error
                ? err.message
                : String(err)
          );
        }
      }
    }

    const onScroll = () => {
      const c = pagesRef.current;
      if (!c) return;
      if (c.scrollTop + c.clientHeight >= c.scrollHeight - 300) {
        renderNext();
      }
    };

    load();
    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelled = true;
      container.removeEventListener("scroll", onScroll);
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      docRef.current = null;
      nextPageRef.current = 1;
    };
  }, [src, pdfjs]);

  return (
    <div className="mobile-pdf">
      <p className="mobile-pdf__status" role="status">
        {status === "loading" && "正在加载全文，首次打开较慢，请稍候…"}
        {status === "ready" && `已渲染 ${rendered} / ${pageCount} 页 · 往下滑继续加载`}
        {status === "error" && "预览加载失败："}
      </p>
      <div className="mobile-pdf__pages" ref={pagesRef}>
        {status === "error" && (
          <p className="mobile-pdf__error">
            预览加载失败：{errorMsg ?? "未知错误"}
            <br />
            你可以点上方「新窗口打开」，或用手机自带阅读器打开下载的 PDF。
          </p>
        )}
      </div>
    </div>
  );
}
