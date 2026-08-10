import { INTERESTS } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";

// 个性化：游戏 / 歌手 / 装备与工具（分组列表，label + note）
export default function InterestsCard() {
  return (
    <Frame>
      <SectionTitle title={INTERESTS.title} />
      <div className="interests-groups">
        {INTERESTS.groups.map((group) => (
          <div key={group.name} className="interests-group">
            <h3 className="interests-group__title">{group.name}</h3>
            <ul className="interests-list">
              {group.items.map((item) => (
                <li key={item.label} className="interests-item">
                  <span className="interests-item__label">{item.label}</span>
                  <span className="interests-item__note">{item.note}</span>
                </li>
              ))}
            </ul>
            {"note" in group && group.note ? (
              <p className="interests-group__note">{group.note}</p>
            ) : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}
