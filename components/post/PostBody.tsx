import type { CSSProperties } from "react";
import type { Block } from "@/lib/posts";

// 正文块渲染器：逐块渲染（标题 / 段落 / 引用 / 列表 / 代码块 / 插图 / 表格）

/** 按列对齐：取表格 align 声明（left 是默认值，可省略） */
function cellAlign(
  align: (string | null)[],
  i: number
): CSSProperties | undefined {
  const a = align[i];
  return a && a !== "left" ? { textAlign: a as CSSProperties["textAlign"] } : undefined;
}
export default function PostBody({ content }: { content: Block[] }) {
  return (
    <div className="post-body">
      {content.map((block, i) => {
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={i}>{block.text}</h2>
            ) : (
              <h3 key={i}>{block.text}</h3>
            );
          case "paragraph":
            return <p key={i}>{block.text}</p>;
          case "quote":
            return <blockquote key={i}>{block.text}</blockquote>;
          case "list":
            return block.ordered ? (
              <ol key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre key={i}>
                <code>{block.code}</code>
              </pre>
            );
          case "image":
            return (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt ?? ""} />
                {block.caption ? (
                  <figcaption>{block.caption}</figcaption>
                ) : null}
              </figure>
            );
          case "imageRow":
            return (
              <div className="image-row" key={i}>
                {block.images.map((img, j) => (
                  <figure key={j}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.alt ?? ""} />
                    {img.caption ? (
                      <figcaption>{img.caption}</figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            );
          case "imageGrid": {
            // 列数 = 最长一行的图片数；每行等宽（列对齐），单元格拉伸到行高（行对齐）
            const cols = Math.max(1, ...block.rows.map((row) => row.length));
            return (
              <div
                className="image-grid"
                key={i}
                style={{ "--grid-cols": cols } as CSSProperties}
              >
                {block.rows.flatMap((row, j) =>
                  row.map((img, k) => (
                    <figure key={`${j}-${k}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.src} alt={img.alt ?? ""} />
                      {img.caption ? (
                        <figcaption>{img.caption}</figcaption>
                      ) : null}
                    </figure>
                  ))
                )}
              </div>
            );
          }
          case "table":
            return (
              <div className="post-table" key={i}>
                <table>
                  {block.head.length > 0 ? (
                    <thead>
                      <tr>
                        {block.head.map((cell, j) => (
                          <th key={j} style={cellAlign(block.align, j)}>
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k} style={cellAlign(block.align, k)}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
