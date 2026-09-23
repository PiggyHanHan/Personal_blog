import type { FeaturedContent } from "@/lib/content";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";
import ProjectCard from "@/components/projects/ProjectCard";

// 精选项目：项目卡片列表（完整信息：名称/地址/描述/状态/意义）
// 数据来自 content/projects.json（由页面读取后传入）
export default function FeaturedProjects({
  featured,
}: {
  featured: FeaturedContent;
}) {
  return (
    <Frame>
      <SectionTitle title={featured.title} />
      {featured.projects.length === 0 ? (
        <p className="empty">{featured.empty}</p>
      ) : (
        <div className="project-list">
          {featured.projects.map((p) => (
            <ProjectCard key={p.name} project={p} />
          ))}
        </div>
      )}
    </Frame>
  );
}
