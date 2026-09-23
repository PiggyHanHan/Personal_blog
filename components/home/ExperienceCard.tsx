import { EXPERIENCE } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";

// 经历：时间轴（时间点 + 标题 + 描述）
export default function ExperienceCard() {
  return (
    <Frame>
      <SectionTitle title={EXPERIENCE.title} />
      <ol className="timeline">
        {EXPERIENCE.items.map((item, i) => (
          <li key={i} className="timeline-item">
            <span className="timeline-item__date">{item.date}</span>
            <div className="timeline-item__body">
              <h3 className="timeline-item__title">{item.title}</h3>
              <p className="timeline-item__text">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Frame>
  );
}
