import { PROJECTS } from "@/lib/site";

export const metadata = { title: "项目" };

export default function ProjectsPage() {
  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{PROJECTS.title}</h1>
        <p>{PROJECTS.intro}</p>
      </div>

      {PROJECTS.projects.length === 0 ? (
        <p className="empty">{PROJECTS.empty}</p>
      ) : (
        <div className="project-list">
          {PROJECTS.projects.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="project-card"
            >
              <strong className="project-card__name">{p.name}</strong>
              <span className="project-card__desc">{p.desc}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
