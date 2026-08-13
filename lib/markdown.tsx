// ============================================================
// Markdown → Block 转换层。
// 用 remark-parse 把 Markdown 正文解析成 mdast 节点树，
// 再映射成 lib/posts.ts 里的 Block 结构（服务端专用）。
// 行内格式（粗体/斜体/链接/行内代码/删除线）转换为 React 元素。
// ============================================================
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
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
  Table,
  TableRow,
  TableCell,
} from "mdast";
import type { Block, PostImage } from "./posts";

const parser = unified().use(remarkParse).use(remarkGfm);

/** 把 Markdown 正文解析成 Block[] */
export function markdownToBlocks(md: string): Block[] {
  const tree = parser.parse(md) as Root;
  const blocks: Block[] = [];
  for (const node of tree.children) {
    blocks.push(...nodeToBlocks(node));
  }
  return mergeImageRuns(blocks);
}

/** 相邻的图片段合并成图片网格：md 里每一行图片 = 网格的一行，连续多行组成矩阵。
 *  例：一行 2 张图 → 1×2 行；两行各 2 张 → 2×2 矩阵；单张 → 1×1。 */
function mergeImageRuns(blocks: Block[]): Block[] {
  const out: Block[] = [];
  let rows: PostImage[][] = [];
  const flush = () => {
    if (rows.length > 0) {
      out.push({ type: "imageGrid", rows });
      rows = [];
    }
  };
  for (const block of blocks) {
    if (block.type === "image") {
      rows.push([{ src: block.src, alt: block.alt, caption: block.caption }]);
    } else if (block.type === "imageRow") {
      rows.push(block.images);
    } else {
      flush();
      out.push(block);
    }
  }
  flush();
  return out;
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
    case "table":
      return [tableToBlock(node as Table)];
    case "thematicBreak":
    case "html":
      // 分隔线 / 原始 HTML：暂不支持，跳过
      return [];
    default:
      return [];
  }
}

/** 段落：整段只有图片时拆成图片行（imageRow）。
 *  一段图片 = 一行：同行多图 → 1 行；段内用行尾两个空格（硬换行）→ 每行拆成一行；
 *  空行分隔的多段 → 由 mergeImageRuns 合并成多行网格（矩阵）。
 *  注意：remark-parse 会在行内相邻图片之间插入纯空白的 text 节点，先剔除空白文本。 */
function paragraphToBlocks(node: Paragraph): Block[] {
  const meaningful = node.children.filter(
    (child) => !(child.type === "text" && child.value.trim() === "")
  );
  const allImagesOrBreaks =
    meaningful.length > 0 &&
    meaningful.every(
      (child) => child.type === "image" || child.type === "break"
    );
  if (!allImagesOrBreaks) {
    return [{ type: "paragraph", text: inline(node.children) }];
  }

  // 按硬换行（break）把段内图片拆成多行；没有 break 就整段一行
  const rows: Image[][] = [];
  let current: Image[] = [];
  for (const child of meaningful) {
    if (child.type === "break") {
      if (current.length > 0) {
        rows.push(current);
        current = [];
      }
    } else {
      current.push(child as Image);
    }
  }
  if (current.length > 0) rows.push(current);

  const toImage = (img: Image) => ({
    src: img.url,
    alt: img.alt ?? undefined,
    caption: img.title ?? undefined,
  });
  return rows.map((row) => ({ type: "imageRow", images: row.map(toImage) }));
}

/** GFM 表格 → table 块：首行作表头，其余为数据行，单元格支持行内格式 */
function tableToBlock(node: Table): Block {
  const rows = node.children.map((row) =>
    (row as TableRow).children.map((cell) =>
      inline((cell as TableCell).children)
    )
  );
  const [head = [], ...body] = rows;
  return { type: "table", align: node.align ?? [], head, rows: body };
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
