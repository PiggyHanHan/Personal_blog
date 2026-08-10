import { FEATURED } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";
import ProjectCard from "@/components/projects/ProjectCard";

// 精选项目：项目卡片列表（完整信息：名称/地址/描述/状态/意义）
export default function FeaturedProjects() {
  return (
    <Frame>
      <SectionTitle title={FEATURED.title} />
      {FEATURED.projects.length === 0 ? (
        <p className="empty">{FEATURED.empty}</p>
      ) : (
        <div className="project-list">
          {FEATURED.projects.map((p) => (
            <ProjectCard key={p.name} project={p} />
          ))}
        </div>
      )}
    </Frame>
  );
}
