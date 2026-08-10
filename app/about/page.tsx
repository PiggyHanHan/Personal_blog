import Link from "next/link";
import { ABOUT } from "@/lib/site";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";

export const metadata = { title: "关于" };

export default function AboutPage() {
  const s = ABOUT.sections;

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{ABOUT.title}</h1>
        <p>{ABOUT.intro}</p>
      </div>

      <Frame className="about-section">
        <SectionTitle title={s.profile} />
        <p>{ABOUT.profile}</p>
      </Frame>

      <Frame className="about-section">
        <SectionTitle title={s.skills} />
        <ul>
          {ABOUT.skills.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Frame>

      <Frame className="about-section">
        <SectionTitle title={s.writing} />
        <ul>
          {ABOUT.writing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Frame>

      <Frame className="about-section">
        <SectionTitle title={s.contact} />
        <p className="about-contact">
          邮箱：{ABOUT.contactEmail}
          <br />
          GitHub：{ABOUT.contactGithub}
        </p>
      </Frame>

      <p className="about-cta">
        <Link href="/posts">{ABOUT.cta}</Link>
      </p>
    </div>
  );
}
