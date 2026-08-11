// ============================================================
// 内容数据层：读取 content/ 下的 JSON 数据文件。
// 项目数据 → content/projects.json，友链数据 → content/links.json。
// 加项目 / 加友链：编辑对应的 JSON 文件即可，无需改代码。
// 此模块仅在服务端组件中使用。
// ============================================================
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Project } from "./site";

const CONTENT_DIR = path.join(process.cwd(), "content");

/** 精选项目（首页区块） */
export type FeaturedContent = {
  title: string;
  empty: string;
  projects: Project[];
};

/** 项目页：左右两列 */
export type ProjectsContent = {
  title: string;
  intro: string;
  columns: { name: string; projects: Project[] }[];
};

/** 友链页 */
export type LinkItem = {
  name: string;
  url: string;
  note?: string;
  avatar?: string;
};
export type LinksContent = {
  title: string;
  intro: string;
  empty: string;
  links: LinkItem[];
};

type ProjectsFile = {
  featured: FeaturedContent;
  projects: ProjectsContent;
};

/** 读取 JSON 数据文件；文件缺失或格式错误时返回 fallback 并打印错误 */
function readJson<T>(file: string, fallback: T): T {
  const full = path.join(CONTENT_DIR, file);
  if (!existsSync(full)) return fallback;
  try {
    return JSON.parse(readFileSync(full, "utf8")) as T;
  } catch (err) {
    console.error(`[content] 解析 ${file} 失败，已使用空数据：`, err);
    return fallback;
  }
}

/** 首页精选项目 */
export function getFeaturedProjects(): FeaturedContent {
  return readJson<ProjectsFile>("projects.json", EMPTY_PROJECTS).featured;
}

/** 项目页全部项目（按列分组） */
export function getProjects(): ProjectsContent {
  return readJson<ProjectsFile>("projects.json", EMPTY_PROJECTS).projects;
}

/** 友链 */
export function getLinks(): LinksContent {
  return readJson<LinksContent>("links.json", EMPTY_LINKS);
}

const EMPTY_PROJECTS: ProjectsFile = {
  featured: {
    title: "精选项目",
    empty: "项目整理中，敬请期待。",
    projects: [],
  },
  projects: { title: "项目", intro: "", columns: [] },
};

const EMPTY_LINKS: LinksContent = {
  title: "友链",
  intro: "",
  empty: "友链建设中，敬请期待。",
  links: [],
};
