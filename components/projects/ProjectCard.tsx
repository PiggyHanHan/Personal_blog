import type { Project } from "@/lib/site";

// 重要性 → 样式类
const priorityClass: Record<string, string> = {
  核心: "project-card__priority--core",
  重要: "project-card__priority--high",
  次要: "project-card__priority--low",
};

// 项目卡片：名称 / 地址（可选）/ 描述 / 状态 / 意义 / 重要性徽章
export default function ProjectCard({ project }: { project: Project }) {
  const { name, url, desc, status, meaning, priority } = project;

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
      <strong className="project-card__name">{name}</strong>
      {url && <span className="project-card__url">{url}</span>}
      <span className="project-card__desc">{desc}</span>
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
