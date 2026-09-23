---
title: PDF 附件与在线预览（示例文章）
slug: pdf-sample
date: 2026-01-03
category: 工程
excerpt: 演示文章页的 PDF 内联预览：frontmatter 加一行 pdf 字段，正文放下载链接，手机端用 pdf.js 渲染。
tags:
  - 示例
  - PDF
pdf: /files/sample-attachment.pdf
---

这篇文章演示**PDF 附件**怎么用：

1. 把 PDF 丢进 `content/files/`（本站这个示例文件就在那里）
2. frontmatter 里加一行：`pdf: /files/文件名.pdf`
3. 正文里写下载链接

[📄 下载示例附件 PDF](/files/sample-attachment.pdf)

效果：

- 文章页顶部出现**内联预览区**：电脑上是浏览器原生阅读器，点进来就能翻页
- 手机上不支持 iframe 内嵌 PDF，本站改用 pdf.js 在页面里渲染（首次打开要等几秒）
- 正文里指向 `/files/*.pdf` 的链接会**触发下载**
- 只换同名 PDF 文件不用重新构建；改了文章正文要重新构建

> 这个示例附件只有一页占位文字。不需要 PDF 功能的话，删掉 `content/files/sample-attachment.pdf` 和这篇文章即可。
