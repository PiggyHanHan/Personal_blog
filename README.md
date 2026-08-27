# 旅行者的见闻录 —— 胡桃风格个人博客

> 基于 Next.js 的个人博客：胡桃·往生堂"开门"开屏动画（往生堂图 → 白屏加载 + Q版胡桃 + 璃月火系神之眼进度条）+ 各地区风景图随机背景轮播 + 文字背光可读性优化。

**在线地址**：http://114.215.204.241

## 这是什么

一个 Next.js + React + TypeScript 的个人博客，当前已实现：

- **开屏动画**：胡桃·往生堂"开门"——全屏往生堂图，点击后淡出并白屏，Q版胡桃淡入浮现，底部加载进度条（左右各一枚璃月火系神之眼装饰），进度走完进入博客
- **背景轮播**：`public/bg/` 下的原神官方风景图随机播放，交叉淡入淡出
- **文字背光**：正文文字带白色柔和光晕，浮在背景图上依然可读（无矩形毛玻璃块）

## 怎么运行

需要 Node.js 18.18 及以上（推荐 LTS 20/22）。

```bash
# 1. 安装依赖（第一次运行才需要）
npm install

# 2. 启动开发服务器（改文件自动刷新）
npm run dev

# 3. 浏览器打开
#    http://localhost:3000   （被占用时终端会提示 3001/3002，打开提示的端口）
```

生产构建（部署前检查用）：

```bash
npm run build
npm run start
```

## 目录结构

```
app/                    # 页面（Next.js App Router）
  layout.tsx            # 全站布局：开屏 + 背景 + 导航 + 页脚
  page.tsx              # 首页：自我介绍 + 冒险者档案 + 最近文章
  posts/page.tsx        # 文章列表页 /posts
  posts/[slug]/page.tsx # 文章详情页 /posts/xxx
  about/page.tsx        # 关于页 /about
  globals.css           # 全局样式
components/
  layout/               # 站点外壳：IntroOverlay 开屏动画、BlogBackground 背景轮播、SettingsButton 设置按钮
  providers/            # 全局状态：BgProvider（背景）、SoundProvider（音量/音效）
  hooks/                # 自定义 hook：useIntroSounds（开屏音效）
  home/                 # 首页卡片：HeroCard / TechStack / QuestBoard / FeaturedProjects 等
  post/                 # 文章页：PostBody / PostNav / PdfPreview / MobilePdfViewer（PDF 预览）
  projects/             # 项目卡片 ProjectCard
  site/                 # 站点布局：SiteSidebar / SiteFooter / SectionTitle / TabbedSections
  ui/                   # 基础 UI：Frame / TagPill / ElementIcon
content/
  posts/*.md           # ★ 文章源文件：加新文章就在这里新建 .md（见下文）
  projects.json        # ★ 项目数据：首页精选 + 项目页两列
  links.json           # ★ 友链数据
lib/
  posts.ts              # 文章数据层：读取 content/posts/*.md
  markdown.tsx          # Markdown → Block 转换（行内格式渲染）
  content.ts            # 项目/友链读取层：读 content/*.json
  site.ts               # 站点配置与页面数据（导航/关于/页脚等）
types/                  # 全局类型声明（pdfjs-legacy.d.ts）
public/
  hutao/                # 开屏素材：door/chibi/bg/vision 四张图（见 README.txt）
  bg/                   # 背景图：往这里丢图片就自动轮播
  files/                # 附件（PDF 等）：往这里丢文件即可被文章链接引用
  friends/              # 友链头像
  intro/                # （旧版视频开屏素材，已废弃，可删除）
docs/
  user/                 # 使用者指南：访问我的博客 / 启动服务器指南 / 内容更新指南
  dev/                  # 开发文档：整体结构设计 / 导航栏与页面内容设计 / 开发备忘
```

## 怎么加一篇文章

在 `content/posts/` 下新建一个 Markdown 文件，文件头用 YAML frontmatter 写元信息，正文直接写 Markdown：

````md
---
title: 文章标题
slug: my-post            # 链接会是 /posts/my-post；必须英文，省略时用文件名
date: 2026-02-01        # YYYY-MM-DD
excerpt: 列表页显示的摘要一句话
tags: [AI, 笔记]
---

这里是正文，支持 **粗体**、`行内代码`、[链接](https://example.com)、引用、列表、```代码块``` 等 Markdown 语法。

## 小节标题

第二段内容。
````

> **文件名可以用中文**（比如 `个人焦虑的剖析与总结.md`），但链接取决于 `slug`（或文件名）——**slug 必须是英文字母/数字/下划线/连字符**，中文 slug 会导致详情页 404。建议：文件名随意，slug 写英文。

保存后刷新页面，新文章会自动出现在列表页；构建时会为每篇文章生成静态页面。

## 怎么放 PDF / 附件文件（比如学术论文）

把文件放进 `public/files/` 文件夹（没有就新建一个），正文里用链接语法指过去：

```md
## 论文

[📄 下载《XXX》全文 PDF](/files/xxx.pdf)
```

- 访问地址就是文件在 `public/files/` 里的路径：`/files/xxx.pdf`
- **中文文件名也可以**，比如 `/files/我的论文.pdf`
- 点链接会在**新标签页**打开 PDF（用浏览器自带的阅读器），原文章页保留
- 放文件不用改代码、不用重新构建，刷新页面即生效

## 怎么加项目 / 友链

编辑 `content/projects.json`（项目）或 `content/links.json`（友链）即可，**不用碰代码**。

**加一个项目**：在 `projects.json` 的 `featured.projects`（首页精选）或 `projects.columns` 某一列的 `projects` 数组里，按下面格式加一项：

```json
{
  "name": "项目名",
  "url": "https://github.com/xxx/xxx",
  "desc": "一句话描述",
  "status": "已完成",
  "meaning": "分类说明",
  "priority": "核心"
}
```

`priority` 可选：`核心` / `重要` / `次要`（影响卡片样式）；`url`、`status`、`meaning` 可省略。

**加一个友链**：在 `links.json` 的 `links` 数组里加一项：

```json
{ "name": "昵称", "url": "https://example.com", "note": "备注", "avatar": "/friends/xxx.png" }
```

`note`、`avatar` 可省略（没有头像时显示首字母）。

> JSON 注意：字段名和字符串用双引号、不能写注释、数组最后一个元素后面不能有多余逗号。改完保存后重新构建（`next build`）即可生效。

## 怎么加背景图

直接把图片文件放进 `public/bg/` 文件夹（支持 jpg/png/webp），刷新页面即自动进入轮播，**无需改代码**。

> 建议用高清大图（≥1920 宽）。低分辨率图 cover 全屏放大后会糊，甚至出现错位。

## 怎么换开屏素材

按 `public/hutao/README.txt` 放图即可——`背景/door.png`（往生堂图）、`小素材/`（chibi1.png 第一张 Q版胡桃、chibi2.png 第二张 Q版胡桃、火系神之眼.png 璃月火系神之眼、火元素图样.png 火元素图样）、`待用库/`（备用素材）。白屏背景装饰自动复用博客背景轮播图并虚化，无需额外素材。上传后刷新即生效，**无需改代码**。

## 怎么改站点文字

- 博客名：`app/layout.tsx` 的 metadata
- 首页自我介绍 / 冒险者档案：`app/page.tsx`
- 关于页：`app/about/page.tsx`
- 全局样式（配色、文字背光、卡片）：`app/globals.css`

## 部署

博客已部署到阿里云服务器，24 小时在线。

**在线地址**：http://114.215.204.241

详细部署流程见 `docs/user/启动服务器指南.md`。
