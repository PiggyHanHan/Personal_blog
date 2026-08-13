import Link from "next/link";
import Frame from "@/components/ui/Frame";
import SectionTitle from "@/components/site/SectionTitle";
import PostBody from "@/components/post/PostBody";
import HutaoDoll from "@/components/about/HutaoDoll";
import { ABOUT, CHANGELOG } from "@/lib/site";
import { getLatestChangelog } from "@/lib/changelog";

export const metadata = { title: "关于" };

export default function AboutPage() {
  const s = ABOUT.sections;
  const latest = getLatestChangelog();

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{ABOUT.title}</h1>
        <p>{ABOUT.intro}</p>
      </div>

      {/* 顶部：博客更新日志 —— 不点进去先看最近一次，点「查看全部」进卡片列表 /changelog */}
      <Frame className="about-section">
        <SectionTitle title={s.changelog} />
        {latest ? (
          <>
            <p className="about-changelog-hint">{ABOUT.changelogIntro}</p>
            <h3 className="about-changelog-title">{latest.title}</h3>
            <p className="about-changelog-date">{latest.date}</p>
            <PostBody content={latest.content} />
            <p className="about-changelog-more">
              <Link href="/changelog">{ABOUT.changelogMore}</Link>
            </p>
          </>
        ) : (
          <p className="empty">{CHANGELOG.empty}</p>
        )}
      </Frame>

      {/* 中间：本站仓库（GitHub） */}
      <Frame className="about-section">
        <SectionTitle title={s.repo} />
        <p>{ABOUT.repoDesc}</p>
        <p className="about-repo-link">
          <a href={ABOUT.repoUrl} target="_blank" rel="noreferrer">
            {ABOUT.repoUrl} ↗
          </a>
        </p>
      </Frame>

      {/* 底部：胡桃玩偶（点击说话 + Q 弹反馈） */}
      <Frame className="about-section">
        <SectionTitle title={s.doll} />
        <p className="about-doll-hint">{ABOUT.dollHint}</p>
        <div className="about-doll">
          <HutaoDoll />
        </div>
      </Frame>
    </div>
  );
}
