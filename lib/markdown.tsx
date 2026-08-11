// ============================================================
// Markdown → Block 转换层。
// 用 remark-parse 把 Markdown 正文解析成 mdast 节点树，
// 再映射成 lib/posts.ts 里的 Block 结构（服务端专用）。
// 行内格式（粗体/斜体/链接/行内代码/删除线）转换为 React 元素。
// ============================================================
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { ReactNode } from "react";
import type {
  Root,
  RootContent,
  PhrasingContent,
  Paragraph,
  Blockquote,
  List,
  ListItem,
  Image,
} from "mdast";
import type { Block } from "./posts";

const parser = unified().use(remarkParse);

/** 把 Markdown 正文解析成 Block[] */
export function markdownToBlocks(md: string): Block[] {
  const tree = parser.parse(md) as Root;
  const blocks: Block[] = [];
  for (const node of tree.children) {
    blocks.push(...nodeToBlocks(node));
  }
  return blocks;
}

/** 块级节点 → Block[]（一个节点可能展开成 0~1 个块） */
function nodeToBlocks(node: RootContent): Block[] {
  switch (node.type) {
    case "heading": {
      // Block 只支持 2/3 级标题：# / ## → 2，### 及以上 → 3
      const level = node.depth <= 2 ? 2 : 3;
      return [{ type: "heading", level, text: inline(node.children) }];
    }
    case "paragraph":
      return paragraphToBlocks(node);
    case "blockquote":
      return [{ type: "quote", text: quoteText(node) }];
    case "list":
      return [listToBlock(node)];
    case "code":
      return [{ type: "code", lang: node.lang ?? undefined, code: node.value }];
    case "thematicBreak":
    case "html":
      // 分隔线 / 原始 HTML：暂不支持，跳过
      return [];
    default:
      return [];
  }
}

/** 段落：整段只有一张图时转成 image 块（可带图注），否则是普通段落 */
function paragraphToBlocks(node: Paragraph): Block[] {
  if (node.children.length === 1 && node.children[0].type === "image") {
    const img = node.children[0] as Image;
    return [
      {
        type: "image",
        src: img.url,
        alt: img.alt ?? undefined,
        caption: img.title ?? undefined,
      },
    ];
  }
  return [{ type: "paragraph", text: inline(node.children) }];
}

/** 引用：内部多个段落用 <br /> 连接 */
function quoteText(node: Blockquote): ReactNode {
  const parts: ReactNode[] = [];
  for (const child of node.children) {
    if (child.type === "paragraph") {
      if (parts.length > 0) parts.push(<br key={parts.length} />);
      parts.push(...arrayOf(inline(child.children)));
    }
  }
  return parts.length === 0 ? "" : parts;
}

/** 列表项：取内部文本，多段用 <br /> 连接（嵌套列表暂不渲染） */
function listToBlock(node: List): Block {
  return {
    type: "list",
    ordered: node.ordered === true,
    items: node.children.map(listItemText),
  };
}

function listItemText(item: ListItem): ReactNode {
  const parts: ReactNode[] = [];
  for (const child of item.children) {
    if (child.type === "paragraph") {
      if (parts.length > 0) parts.push(<br key={parts.length} />);
      parts.push(...arrayOf(inline(child.children)));
    }
  }
  return parts.length === 0 ? "" : parts;
}

/** 行内节点序列 → ReactNode（单个纯文本时直接返回字符串） */
function inline(nodes: PhrasingContent[]): ReactNode {
  const parts = nodes.map((node, i) => inlineNode(node, i));
  if (parts.length === 1 && typeof parts[0] === "string") return parts[0];
  return parts;
}

function inlineNode(node: PhrasingContent, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "strong":
      return <strong key={key}>{inline(node.children)}</strong>;
    case "emphasis":
      return <em key={key}>{inline(node.children)}</em>;
    case "delete":
      return <del key={key}>{inline(node.children)}</del>;
    case "inlineCode":
      return <code key={key}>{node.value}</code>;
    case "link": {
      // 站内 /files/ 下的 PDF 附件 → 走下载接口（点击即下载）
      // 外链或其它 PDF → 新标签打开；站内普通链接 → 同页跳转
      let href = node.url;
      let openInNew = false;
      if (/^\/files\/.+\.pdf$/i.test(node.url)) {
        href = "/api/download" + node.url.slice("/files".length);
      } else if (/^https?:\/\//.test(node.url) || /\.pdf(\?|#|$)/i.test(node.url)) {
        openInNew = true;
      }
      return (
        <a
          key={key}
          href={href}
          target={openInNew ? "_blank" : undefined}
          rel={openInNew ? "noreferrer" : undefined}
        >
          {inline(node.children)}
        </a>
      );
    }
    case "image":
      return <img key={key} src={node.url} alt={node.alt ?? ""} />;
    case "break":
      return <br key={key} />;
    case "html":
      // 原始 HTML 按文本转义显示
      return node.value;
    default:
      return null;
  }
}

function arrayOf(node: ReactNode): ReactNode[] {
  return Array.isArray(node) ? node : [node];
}
