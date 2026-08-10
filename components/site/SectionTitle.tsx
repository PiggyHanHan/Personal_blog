// 区块标题：左金色竖条 + 标题 + 右侧金线延伸（可选前置图标）
export default function SectionTitle({
  title,
  icon,
}: {
  title: string;
  icon?: string;
}) {
  return (
    <h2 className="section-title">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="section-title__icon" src={icon} alt="" aria-hidden />
      ) : null}
      <span className="section-title__text">{title}</span>
    </h2>
  );
}
