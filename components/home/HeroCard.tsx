import { HERO } from "@/lib/site";
import Frame from "@/components/ui/Frame";

// 首页 · 名片：左胡桃立绘 + 右姓名/性别/生日/学校/学院/班级/科研方向
export default function HeroCard() {
  return (
    <Frame className="hero-card">
      <div className="hero-card__avatar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO.avatar} alt={`${HERO.name} 的照片`} draggable={false} />
      </div>
      <div className="hero-card__body">
        <h1 className="hero-card__name">{HERO.name}</h1>
        <p className="hero-card__motto">{HERO.motto}</p>

        <dl className="hero-info">
          <div className="hero-info__row">
            <dt>性别</dt>
            <dd>{HERO.gender}</dd>
          </div>
          <div className="hero-info__row">
            <dt>生日</dt>
            <dd>{HERO.birthday}</dd>
          </div>
          <div className="hero-info__row">
            <dt>学校</dt>
            <dd>
              <a href={HERO.school.url} target="_blank" rel="noreferrer">
                {HERO.school.name} ↗
              </a>
            </dd>
          </div>
          <div className="hero-info__row">
            <dt>学院</dt>
            <dd>
              <a href={HERO.college.url} target="_blank" rel="noreferrer">
                {HERO.college.name} ↗
              </a>
            </dd>
          </div>
          <div className="hero-info__row">
            <dt>班级</dt>
            <dd>{HERO.major}</dd>
          </div>
          <div className="hero-info__row">
            <dt>科研方向</dt>
            <dd className="hero-info__research">{HERO.research}</dd>
          </div>
        </dl>

        {HERO.socials.length > 0 && (
          <div className="hero-card__socials">
            {HERO.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="hero-card__social"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}
