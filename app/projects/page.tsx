import { PROJECTS } from "@/lib/site";
import ProjectCard from "@/components/projects/ProjectCard";

export const metadata = { title: "项目" };

export default function ProjectsPage() {
  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{PROJECTS.title}</h1>
        <p>{PROJECTS.intro}</p>
      </div>

      {/* 左右两列：学术项目 | 个人项目 */}
      <div className="projects-columns">
        {PROJECTS.columns.map((col) => (
          <section key={col.name} className="projects-col">
            <h2 className="projects-col__title">{col.name}</h2>
            <div className="projects-col__list">
              {col.projects.map((p) => (
                <ProjectCard key={p.name} project={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
