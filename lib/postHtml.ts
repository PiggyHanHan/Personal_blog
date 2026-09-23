// ============================================================
// Block[] → HTML 字符串（私有文章加密用）
//
// 为什么不用 react-dom/server 的 renderToStaticMarkup：
//   Next.js 禁止在服务端组件图里 import react-dom/server（构建直接报错
//   "You're importing a component that imports react-dom/server"），
//   而加密必须发生在构建期、页面渲染之前，所以这里自带一个极小的序列化器。
//
// ⚠ 不变式：本文件必须与 components/post/PostBody.tsx 保持同构——
//   标签结构、class 名、行内元素映射都要一致，否则私有文章解锁后的排版会与公开文章不一样。
//   改 PostBody 时请同步改这里（scripts/verify-private-crypto.mjs 会解密真实载荷并
//   断言正文文本与源 Markdown 对得上，能兜住大部分漂移）。
//
// 支持的行内内容：字符串 / 数字 / 数组 / 原生标签元素（strong、em、del、code、a、img、br、
//   span[KaTeX] 等，由 lib/markdown.tsx 产生）——按元素通用处理，将来新增行内标签也不用改这里。
// 自定义组件（type 不是字符串）会被跳过：markdown 层目前不会产生。
// ============================================================
import type { Block, PostImage } from "./posts";

/** 自闭合标签 */
const VOID_TAGS = new Set(["img", "br", "hr", "input", "source", "meta", "link"]);

/** 数值型 CSS 属性（不加 px） */
const UNITLESS = new Set([
  "z-index",
  "opacity",
  "flex",
  "flex-grow",
  "flex-shrink",
  "order",
  "line-height",
  "font-weight",
]);

/** 文本转义（进入 HTML 文本节点） */
function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 属性值转义 */
function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

/** React 的 style 对象 → CSS 文本（支持 --custom-prop 与驼峰 → 短横线） */
function styleToCss(style: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === "") continue;
    const prop = key.startsWith("--")
      ? key
      : key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
    const text =
      typeof value === "number"
        ? key.startsWith("--") || UNITLESS.has(prop)
          ? String(value)
          : `${value}px`
        : String(value);
    parts.push(`${prop}:${text}`);
  }
  return parts.join(";");
}

type ElementLike = { type: unknown; props: Record<string, unknown> };

function isElement(node: unknown): node is ElementLike {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    "props" in node &&
    typeof (node as ElementLike).props === "object" &&
    (node as ElementLike).props !== null
  );
}

function attrsOf(props: Record<string, unknown>): string {
  let out = "";
  for (const [key, value] of Object.entries(props)) {
    if (
      key === "children" ||
      key === "dangerouslySetInnerHTML" ||
      key === "key" ||
      key === "ref"
    ) {
      continue;
    }
    if (typeof value === "function") continue;
    if (value === true) {
      out += ` ${key === "className" ? "class" : key}`;
      continue;
    }
    if (value === null || value === undefined || value === false) continue;
    if (key === "style") {
      const css =
        typeof value === "string"
          ? value
          : styleToCss(value as Record<string, unknown>);
      if (css) out += ` style="${escapeAttr(css)}"`;
      continue;
    }
    const name = key === "className" ? "class" : key === "htmlFor" ? "for" : key;
    out += ` ${name}="${escapeAttr(String(value))}"`;
  }
  return out;
}

/** ReactNode → HTML（字符串 / 数字 / 数组 / 元素） */
export function renderNode(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return escapeText(node);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderNode).join("");
  if (!isElement(node)) return "";

  const { type, props } = node;
  if (typeof type !== "string") return ""; // 自定义组件：markdown 层不会产生，直接跳过

  const attrs = attrsOf(props);
  const dangerous = props.dangerouslySetInnerHTML as
    | { __html?: unknown }
    | undefined;
  const inner =
    dangerous && typeof dangerous.__html === "string"
      ? dangerous.__html // KaTeX 已渲染好的 HTML，原样透传
      : renderNode(props.children);

  return VOID_TAGS.has(type)
    ? `<${type}${attrs} />`
    : `<${type}${attrs}>${inner}</${type}>`;
}

/** 单元格对齐（与 PostBody 的 cellAlign 一致：left 是默认值，不写） */
function cellAlignAttr(align: (string | null)[], i: number): string {
  const a = align[i];
  return a && a !== "left" ? ` style="text-align:${escapeAttr(a)}"` : "";
}

/** 单张插图（与 PostBody 的 image / imageRow / imageGrid 分支一致） */
function figureHtml(img: PostImage): string {
  const caption = img.caption
    ? `<figcaption>${escapeText(img.caption)}</figcaption>`
    : "";
  return `<figure><img src="${escapeAttr(img.src)}" alt="${escapeAttr(
    img.alt ?? ""
  )}" />${caption}</figure>`;
}

/** Block[] → `<div class="post-body">…</div>`（与 PostBody 输出同构） */
export function blocksToHtml(blocks: Block[]): string {
  const out: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        out.push(
          block.level === 2
            ? `<h2>${renderNode(block.text)}</h2>`
            : `<h3>${renderNode(block.text)}</h3>`
        );
        break;
      case "paragraph":
        out.push(`<p>${renderNode(block.text)}</p>`);
        break;
      case "quote":
        out.push(`<blockquote>${renderNode(block.text)}</blockquote>`);
        break;
      case "list": {
        const items = block.items
          .map((item) => `<li>${renderNode(item)}</li>`)
          .join("");
        out.push(block.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`);
        break;
      }
      case "code":
        out.push(`<pre><code>${escapeText(block.code)}</code></pre>`);
        break;
      case "math":
        out.push(`<div class="math-display">${block.html}</div>`);
        break;
      case "image":
        out.push(figureHtml(block));
        break;
      case "imageRow":
        out.push(
          `<div class="image-row">${block.images.map(figureHtml).join("")}</div>`
        );
        break;
      case "imageGrid": {
        const cols = Math.max(1, ...block.rows.map((row) => row.length));
        const imgs = block.rows
          .flatMap((row) => row.map(figureHtml))
          .join("");
        out.push(`<div class="image-grid" style="--grid-cols:${cols}">${imgs}</div>`);
        break;
      }
      case "table": {
        const head =
          block.head.length > 0
            ? `<thead><tr>${block.head
                .map((cell, i) => `<th${cellAlignAttr(block.align, i)}>${renderNode(cell)}</th>`)
                .join("")}</tr></thead>`
            : "";
        const body = block.rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, i) => `<td${cellAlignAttr(block.align, i)}>${renderNode(cell)}</td>`)
                .join("")}</tr>`
          )
          .join("");
        out.push(
          `<div class="post-table"><table>${head}<tbody>${body}</tbody></table></div>`
        );
        break;
      }
      default:
        break;
    }
  }

  return `<div class="post-body">${out.join("")}</div>`;
}
