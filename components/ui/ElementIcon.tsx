// 火系神之眼点缀图标（复用开屏素材，纯装饰）
// className 传入尺寸 / 定位（如 adventurer-card__vision）
const VISION_SRC = "/hutao/使用中/小素材/火系神之眼.png";

export default function ElementIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`element-icon${className ? ` ${className}` : ""}`}
      src={VISION_SRC}
      alt=""
      aria-hidden
      draggable={false}
    />
  );
}
