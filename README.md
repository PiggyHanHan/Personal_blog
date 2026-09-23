# 胡桃风格个人博客模板

> 基于 **Next.js 15 + React 19 + TypeScript** 的个人博客模板。开屏动画、背景轮播、文章 / 项目 / 友链、拼音搜索、Markdown 增强（表格、数学公式、插图网格）、PDF 内联预览、**私有文章 AES-256 加密**——改内容即可，不用碰代码。

## 功能特性

- **开屏动画**：门扉式开屏（场景图 → 白屏加载 + Q版形象 + 神之眼进度条），素材随仓库内置
- **背景轮播**：`public/bg/` 下图片自动随机交叉淡入淡出，随仓库内置 6 张示例背景
- **左侧导航 + 毛玻璃文字**：正文文字带柔光，浮在背景图上依然可读
- **文章系统**：Markdown（GFM 表格 / 删除线）、KaTeX 数学公式、插图自动排版（单张 / 并排 / 网格）、三分类（研究 / 工程 / 生活）
- **拼音搜索**：标题 / 分类 / 标签 / 摘要都支持拼音检索
- **PDF 预览**：文章页内联预览（桌面原生阅读器，手机端 pdf.js 渲染），`/files/` 链接直接下载
- **私有文章**：frontmatter 加一行 `private: true`，构建期 AES-256-GCM 加密正文，读者输口令解密；项目 / 友链也支持私有标记
- **零构建配置**：文章即文件（Markdown），项目 / 友链即 JSON，图片自动压缩

## 快速开始

需要 Node.js 18.18+（推荐 LTS 20/22）。

```bash
# 1. 安装依赖
npm install          # Windows 若 npm 被劫持改用 npm.cmd install

# 2. 启动开发服务器（改文件自动刷新）
npm run dev

# 3. 浏览器打开 http://localhost:3000
```

生产构建与预览：

```bash
npm run build        # 构建前会自动压缩 content/md_images/ 的原图
npm run start        # 预览生产版本
```

> 仓库自带 3 篇示例文章、示例项目 / 友链 / 附件，开箱即有完整效果；确认效果后删掉示例，写你自己的内容。

## 三步改成你的博客

### 第 1 步：改站点信息

编辑 `lib/site.ts`（全部个人信息集中在这里）：

| 要改什么 | 位置 |
| --- | --- |
| 站名 / 副标题 / 页脚 | `SITE` |
| 名片（姓名 / 学校 / 座右铭 / 社交链接） | `HERO` |
| 技术栈进度条 | `TECH` |
| 经历时间线 | `EXPERIENCE` |
| 爱好 / 工具 | `INTERESTS` |
| 关于页的仓库地址 | `ABOUT.repoUrl` |

> 浏览器标签页的站名自动跟随 `SITE.name`，无需另改。

### 第 2 步：写内容（不碰代码）

| 内容 | 位置 |
| --- | --- |
| 文章 | `content/posts/*.md` |
| 项目 | `content/projects.json` |
| 友链 | `content/links.json` |
| 更新日志（访客版） | `content/changelog/<日期>.md` |
| 附件（PDF 等） | `content/files/` |
| 文章插图原图 | `content/md_images/` |

写完删掉示例文件即可（`content/posts/你好，世界.md` 等三篇、`content/files/sample-attachment.pdf`、`content/md_images/sample-*.png`、`content/changelog/2026-01-01.md`）。

### 第 3 步：换素材

- **背景图**：往 `public/bg/` 丢图（jpg/png/webp，建议 ≥1920 宽），自动进入轮播
- **开屏 / 音效素材**：替换 `public/hutao/使用中/` 下的文件（结构见 `public/hutao/README.txt`）
- **头像**：名片左侧的竖图，替换 `HERO.avatar` 指向的文件
- **友链头像**：往 `public/friends/` 丢图，在 `links.json` 填 `avatar` 字段

## 文章写法

在 `content/posts/` 新建 `.md`，文件名随意（可以用中文），文件头用 YAML frontmatter：

```md
---
title: 文章标题
slug: my-post            # 链接 → /posts/my-post；必须英文，省略时用文件名
date: 2026-02-01        # YYYY-MM-DD
category: 研究           # 研究 | 工程 | 生活（缺省为生活）
excerpt: 列表页显示的摘要一句话
tags: [AI, 笔记]
pdf: /files/我的论文.pdf   # 可选：文章页内联预览这个 PDF
# private: true          # 可选：正文加密成私有文章（见下）
---

这里是正文，支持 **粗体**、*斜体*、`行内代码`、[链接](https://example.com)、
引用、列表、代码块、GFM 表格、KaTeX 数学公式（$E=mc^2$）、插图等。
```

**最重要的规则**：`slug` 只能是英文字母 / 数字 / 下划线 / 连字符——中文 slug 会导致详情页 404（构建时会报错提醒）。

详细语法（插图网格、PDF、私有文章）见 `docs/user/内容更新指南.md`，仓库里的 3 篇示例文章就是活的样例。

## 私有文章（正文加密）

1. 文章 frontmatter 加 `private: true`
2. 复制 `.env.example` 为 `.env.local`，填 `PRIVATE_POST_PASSWORD=你的口令`（`.env.local` 不进 Git）
3. 重新构建：构建期 AES-256-GCM 加密正文，页面只下发密文；详情页变成门扉锁屏，读者输口令解密

```bash
# 本地写作预览（不加密，正文明文可见）
npm run start -- -p 3000        # 或用 usertools\local-run.ps1（自动设 SKIP_ENCRYPT=true）

# 正式部署（加密）：直接 npm run build
```

> 没有口令且仓库里存在 `private: true` 的文章时，构建会**直接报错**（刻意防明文泄露）。不想用这个功能就别加那一行；改口令后要重新构建。

## 部署

模板自带「本地构建 → 上传 Linux 服务器 → Nginx + pm2」的一键脚本，在 `usertools/`（Windows PowerShell）：

| 脚本 | 用途 |
| --- | --- |
| `local-run.ps1` | 本地构建 + 80 端口预览 |
| `sync-content.ps1` | 同步 `content/` 并重建 |
| `deploy-code.ps1` | 同步代码并重启 |
| `deploy-fresh.ps1` | 全新部署（需输入 DEPLOY 确认） |
| `setup-nginx.ps1` | Nginx + HTTPS 一次性配置 |
| `setup-ssl.ps1` | 换 SSL 证书 |
| `set-private-password.ps1` | 改私有文章口令 |

首次用打开任一脚本，把顶部的 `$Key`（本地密钥路径）和 `$Server`（`root@你的服务器IP`）改成你自己的；详细流程见 `docs/user/启动服务器指南.md`。

> 也可以部署到任意支持 Next.js 静态/SSR 的平台（Vercel 等），只要保证构建时能读到 `content/` 和 `.env.local`。

## 目录结构

```
app/                    # 页面（Next.js App Router）
  posts/                # 文章列表页（静态 ○）/ 详情页（SSG，私有文章走门扉锁屏）
  api/                  # /api/view /api/download /api/voices
components/
  layout/               # 站点外壳：IntroOverlay 开屏、BlogBackground 背景、SettingsButton
  providers/            # 全局状态：BgProvider、SoundProvider
  home/ post/ projects/ site/ ui/ about/
content/                # ★ 数据源：改内容不碰代码
  posts/*.md            #   文章（frontmatter 见上文）
  files/                #   附件（PDF 等，/files/ 直接托管）
  md_images/            #   文章插图原图（构建时自动压缩到 public/md_images）
  changelog/            #   更新日志（访客版）
  projects.json         #   项目
  links.json            #   友链
lib/                    # 数据层：posts.ts / content.ts / markdown.tsx / site.ts / search.ts / privateContent.ts
scripts/                # compress-md-images.mjs（构建前自动压缩配图）、verify-private-crypto.mjs（加密链路校验）
usertools/              # 部署 / 运维脚本（ps1 需 UTF-8 with BOM）
public/
  bg/                   # 背景轮播图（随仓库发布）
  hutao/使用中/          # 开屏素材 + 音效 + 语音（随仓库发布）
  hutao/待用库/          # 素材备份库（.gitignore，不随仓库走）
  theme/                # 纹章 / 门扉（随仓库发布）
  md_images/            # 压缩后配图（构建产物，勿手改）
docs/
  user/                 # 使用者指南：内容更新指南 / 启动服务器指南
  dev/                  # 开发文档：整体结构 / 搜索 / 加密 / PDF 预览
```

## 技术栈

Next.js 15（App Router）· React 19 · TypeScript · gray-matter · remark-gfm / remark-math（KaTeX）· sharp（配图压缩）· pinyin-pro（拼音索引）· pdfjs-dist（移动端 PDF 渲染）

## License

（建议补充 LICENSE，如 MIT。）第三方素材（`public/hutao/` 内的角色图与语音、`public/bg/` 的背景图）版权归原作者 / 米哈游所有，商用或公开发布前请自行替换或确认授权。
