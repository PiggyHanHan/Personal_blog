import { TECH } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";

// 技术栈：分组成列（语言 / 功能），每行 = 名称 + 掌握程度进度条 + 百分比
export default function TechStack() {
  return (
    <Frame>
      <SectionTitle title={TECH.title} />
      <div className="tech-groups">
        {TECH.groups.map((group) => (
          <div key={group.name} className="tech-group">
            <h3 className="tech-group__title">{group.name}</h3>
            <ul className="tech-list">
              {group.items.map((item) => (
                <li key={item.name} className="tech-row">
                  <span className="tech-name">{item.name}</span>
                  <div
                    className="tech-bar"
                    role="progressbar"
                    aria-valuenow={item.level}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.name} 掌握程度`}
                  >
                    <div
                      className="tech-bar__fill"
                      style={{ width: `${item.level}%` }}
                    />
                  </div>
                  <span className="tech-pct">{item.level}%</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}
