"use client";

import { useEffect, useState } from "react";
import MobilePdfViewer from "./MobilePdfViewer";

// PDF 预览区：桌面用原生 iframe（浏览器内置阅读器，快）；手机/平板用 pdf.js
// 渲染（canvas，任何浏览器都能看）。null = 尚未判定（SSR/首帧），此时不渲染
// 任何 PDF 内容——手机端只要渲染 iframe 就会去加载 PDF 并弹下载。
export default function PdfPreview({ src }: { src: string }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // 移动设备判断：触屏（coarse 指针）、移动 UA、或硬件触屏能力。
    // 不能用视口宽度——iPad/折叠屏/浏览器「电脑模式」会伪装成桌面宽度和 UA，
    // 但只要设备能触摸，一律按移动端走 pdf.js，避免 iframe 触发下载弹窗。
    const isTouchCoarse = window.matchMedia("(pointer: coarse)").matches;
    const uaMobile =
      /Android|iPhone|iPad|iPod|Mobile|Windows Phone|Silk|Kindle/i.test(
        navigator.userAgent
      );
    const touchCapable = navigator.maxTouchPoints > 0;
    setIsMobile(uaMobile || isTouchCoarse || touchCapable);
  }, []);

  return (
    <div className="pdf-preview">
      <div className="pdf-preview__bar">
        <span className="pdf-preview__label">全文预览</span>
        <div className="pdf-preview__actions">
          <a
            className="pdf-preview__open"
            href={src}
            target="_blank"
            rel="noreferrer"
          >
            新窗口打开
          </a>
        </div>
      </div>
      {isMobile === null ? null : isMobile ? (
        <MobilePdfViewer src={src} />
      ) : (
        <iframe
          className="pdf-preview__frame"
          src={src}
          title="PDF 全文预览"
        />
      )}
    </div>
  );
}
