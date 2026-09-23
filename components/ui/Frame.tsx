import type { ReactNode } from "react";

// 卡片：淡纸底 + 细金边（签名装饰留给立绘框与区块标题）
export default function Frame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`frame${className ? ` ${className}` : ""}`}>
      <div className="frame__body">{children}</div>
    </div>
  );
}
