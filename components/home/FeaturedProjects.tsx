import { FEATURED } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";

// 精选项目：项目卡片列表（待用户提供项目信息后填充）
export default function FeaturedProjects() {
  return (
    <Frame>
      <SectionTitle title={FEATURED.title} />
      {FEATURED.projects.length === 0 ? (
        <p className="empty">{FEATURED.empty}</p>
      ) : (
        <div className="project-list">
          {FEATURED.projects.map((p) => (
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
    </Frame>
  );
}
