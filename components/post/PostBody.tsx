import type { Block } from "@/lib/posts";

// 正文块渲染器：逐块渲染（标题 / 段落 / 引用 / 列表 / 代码块 / 插图）
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
          default:
            return null;
        }
      })}
    </div>
  );
}
