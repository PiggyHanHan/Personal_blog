import HeroCard from "@/components/home/HeroCard";
import TechStack from "@/components/home/TechStack";
import ExperienceCard from "@/components/home/ExperienceCard";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import InterestsCard from "@/components/home/InterestsCard";
import { getFeaturedProjects } from "@/lib/content";

export default function HomePage() {
  return (
    <div className="page-stack">
      {/* 名片：立绘 + 姓名/座右铭/性别/生日/学校/学院/班级/科研方向 */}
      <HeroCard />

      {/* 技术栈：语言 / 功能 分组进度条 */}
      <TechStack />

      {/* 经历：时间线 */}
      <ExperienceCard />

      {/* 精选项目（数据来自 content/projects.json） */}
      <FeaturedProjects featured={getFeaturedProjects()} />

      {/* 个性化：游戏 / 歌手 / 装备工具 */}
      <InterestsCard />
    </div>
  );
}
