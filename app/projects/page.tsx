import { getProjects } from "@/lib/content";
import ProjectCard from "@/components/projects/ProjectCard";
import TabbedSections from "@/components/site/TabbedSections";

export const metadata = { title: "项目" };

export default function ProjectsPage() {
  const projects = getProjects();

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{projects.title}</h1>
        <p>{projects.intro}</p>
      </div>

      {/* 顶部切换：学术项目 | 个人项目 */}
      <TabbedSections
        tabs={projects.columns.map((col) => ({
          name: col.name,
          content: (
            <div className="projects-col__list">
              {col.projects.map((p) => (
                <ProjectCard key={p.name} project={p} />
              ))}
            </div>
          ),
        }))}
      />
    </div>
  );
}
