// 标签徽章（米金底 + 深红字，样式见 blog.css）
export default function TagPill({ tag }: { tag: string }) {
  return <span className="tag-pill">{tag}</span>;
}
