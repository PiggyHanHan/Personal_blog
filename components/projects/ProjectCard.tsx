import type { Project } from "@/lib/site";
import Sigil from "@/components/ui/Sigil";

// 重要性 → 样式类
const priorityClass: Record<string, string> = {
  核心: "project-card__priority--core",
  重要: "project-card__priority--high",
  次要: "project-card__priority--low",
};

// 项目卡片：名称 / 地址（可选）/ 描述 / 状态 / 意义 / 重要性徽章
// private: true 的项目（如仓库未公开）纹章换成七七蓝魂魄并标「私有」
export default function ProjectCard({ project }: { project: Project }) {
  const { name, url, desc, status, meaning, priority, private: isPrivate } = project;

  const inner = (
    <>
      {priority && (
        <span
          className={`project-card__priority ${
            priorityClass[priority] ?? ""
          }`}
        >
          {priority}
        </span>
      )}
      <span className="project-card__head">
        <strong className="project-card__name">{name}</strong>
        {isPrivate ? (
          <span className="locked-pill">
            <span aria-hidden>🔒</span> 私有
          </span>
        ) : null}
      </span>
      {url && <span className="project-card__url">{url}</span>}
      <span className="project-card__desc">{desc}</span>
      <span className="project-card__foot">
        {(status || meaning) && (
          <span className="project-card__meta">
            {status && (
              <span className="project-card__status">状态：{status}</span>
            )}
            {meaning && (
              <span className="project-card__meaning">意义：{meaning}</span>
            )}
          </span>
        )}
      </span>
      {/* 纹章：骑在卡片右下角（~1/3 在内、2/3 在外），位置/尺寸见 blog.css 的 .project-card > .sigil */}
      <Sigil variant={isPrivate ? "private" : "public"} />
    </>
  );

  return url ? (
    <a
      className="project-card"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      {inner}
    </a>
  ) : (
    <div className="project-card">{inner}</div>
  );
}
