# 胡桃风格个人博客模板

> 基于 **Next.js 15 + React 19 + TypeScript** 的个人博客模板。开屏动画、背景轮播、文章 / 项目 / 友链、拼音搜索、Markdown 增强（表格、数学公式、插图网格）、PDF 内联预览、**私有文章 AES-256 加密**、**访客计数 / 点赞 / 表情（SQLite 落盘）**——改内容即可，不用碰代码。

## 功能特性

- **开屏动画**：门扉式开屏（场景图 → 白屏加载 + Q版形象 + 神之眼进度条），素材随仓库内置
- **背景轮播**：`public/bg/` 下图片自动随机交叉淡入淡出，随仓库内置 6 张示例背景
- **左侧导航 + 毛玻璃文字**：正文文字带柔光，浮在背景图上依然可读
- **文章系统**：Markdown（GFM 表格 / 删除线）、KaTeX 数学公式、插图自动排版（单张 / 并排 / 网格）、三分类（研究 / 工程 / 生活）
- **拼音搜索**：标题 / 分类 / 标签 / 摘要都支持拼音检索
- **PDF 预览**：文章页内联预览（桌面原生阅读器，手机端 pdf.js 渲染），`/files/` 链接直接下载
- **私有文章**：frontmatter 加一行 `private: true`，构建期 AES-256-GCM 加密正文，读者输口令解密；项目 / 友链也支持私有标记
- **互动数据**：访客计数（今日 / 历史）、单篇翻阅次数、点赞 + 三种表情，`node:sqlite` 落盘；页面仍是纯静态，数字由客户端 hydrate 后拉取
- **趣味互动**：点击冒出火元素粒子、胡桃脸返回顶部、点 Q 版胡桃 / 点神之眼随机说一句台词
- **零构建配置**：站点信息与文章都是文件（`content/site.json` + Markdown），项目 / 友链即 JSON，配图自动压缩

## 快速开始

需要 **Node.js ≥ 22.13**（互动数据用内置 `node:sqlite`，低于这个版本要加 `--experimental-sqlite`）。

```bash
# 1. 安装依赖
npm install          # Windows 若 npm 被劫持改用 npm.cmd install

# 2. 启动开发服务器（改文件自动刷新）
npm run dev

# 3. 浏览器打开 http://localhost:3000
```

生产构建与预览：

```bash
npm run build        # 构建前会自动压缩 content/md_images/ 的原图、生成文章清单 data/post-index.json
npm run start        # 预览生产版本
```

> 仓库自带 3 篇示例文章、示例项目 / 友链 / 附件，开箱即有完整效果；确认效果后删掉示例，写你自己的内容。

## 三步改成你的博客

### 第 1 步：改站点信息

编辑 `content/site.json`（全部个人信息集中在这里，改 JSON 不碰代码）：

| 要改什么 | 键 |
| --- | --- |
| 站名 / 副标题 / 页脚 | `site` |
| 名片（姓名 / 学校 / 座右铭 / 社交链接） | `hero` |
| 技术栈进度条 | `tech` |
| 经历时间线 | `experience` |
| 爱好 / 工具 | `interests` |
| 关于页的仓库地址 | `about.repoUrl` |

> 浏览器标签页的站名自动跟随 `site.name`，无需另改。
> 导航文案、"阅读全文"这类**界面文案**仍在 `lib/site.ts`，跟着代码走，一般不用动。

### 第 2 步：写内容（不碰代码）

| 内容 | 位置 |
| --- | --- |
| 站点信息 / 首页卡片 | `content/site.json` |
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
- **头像**：名片左侧的竖图，替换 `hero.avatar` 指向的文件
- **友链头像**：往 `public/friends/` 丢图，在 `links.json` 填 `avatar` 字段
- **语音**：`public/theme/voice/hutao/`（点 Q 版胡桃）与 `public/theme/voice/vision/`（点神之眼）——丢音频文件就进随机池，以 `_` 开头的不进
- **纹章 / 门扉 / 神之眼 / 火元素 / 返回顶部那张脸**：`public/theme/` 下的 webp，换图覆盖同名文件即可

> 新素材请一律放 `public/theme/`：它进部署包；`public/hutao/` 只在本机与仓库里，服务器上不会有新增文件。

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

## 互动数据（访客 / 点赞 / 表情）

开箱即用，不需要注册任何第三方统计。访客计数、单篇翻阅次数、点赞与表情都存在**你自己的服务器**上：

- 数据文件 `data/blog.db`（SQLite，WAL 模式），首次请求时自动创建；`data/` 已被 `.gitignore` 忽略
- 隐私口径：只存 `sha256(IP + UA + 随机盐 + 当天)` 的前 32 位，**不存 IP、不写 Cookie**；盐随库生成，不进 Git
- 页面保持静态（○）：所有数字都是 hydrate 之后由客户端拉取，所以 `/posts` 仍是纯静态 HTML
- 不想用：删掉 `app/api/stats`、`app/api/like` 两个路由即可，前端会静默降级（侧边栏显示「旅人簿暂不可用」、卡片不显示赞数），不会白屏
- 备份 / 清零：见 `docs/user/启动服务器指南.md` 第六节；设计细节见 `docs/dev/互动数据.md`

> ⚠️ 本地开发时把 `data/` 当成一次性数据：删掉它就等于清零，重新访问会从「第 1 位旅人」开始。

## 部署

模板自带「本地构建 → 上传 Linux 服务器 → Nginx + pm2」的一键脚本，在 `usertools/`（Windows PowerShell）：

| 脚本 | 用途 |
| --- | --- |
| `local-run.ps1` | 本地构建 + 80 端口预览 |
| `sync-content.ps1` | 同步 `content/` 并重建 |
| `deploy-code.ps1` | 同步代码并重启（保留 `.next/cache` 与 `data/`） |
| `deploy-fresh.ps1` | 全新部署（需输入 DEPLOY 确认） |
| `setup-nginx.ps1` | Nginx + HTTPS 一次性配置（含互动接口限流、防域名寄生） |
| `setup-ssl.ps1` | 换 SSL 证书 |
| `set-private-password.ps1` | 改私有文章口令 |

首次用打开任一脚本，把顶部的 `$Key`（本地密钥路径）和 `$Server`（`root@你的服务器IP`）改成你自己的；详细流程见 `docs/user/启动服务器指南.md`。

> 也可以部署到任意支持 Next.js SSR 的平台（Vercel 等），但 SQLite 需要**可持久化的本地磁盘**——Serverless 环境请换成外部数据库，或删掉互动接口。

## 目录结构

```
app/                    # 页面（Next.js App Router）
  posts/                # 文章列表页（静态 ○）/ 详情页（SSG，私有文章走门扉锁屏）
  api/                  # /api/view /api/download /api/voices /api/stats /api/like
components/
  layout/               # 站点外壳：IntroOverlay 开屏、BlogBackground 背景、SettingsButton、BackToTop、FireSparks
  interaction/          # 互动：VisitReporter（只上报）、VisitorLine（旅人簿）、CardLikes、ReactionBar、ViewCount
  providers/            # 全局状态：BgProvider、SoundProvider
  home/ post/ projects/ site/ ui/ about/
content/                # ★ 数据源：改内容不碰代码
  site.json             #   站点信息 / 首页名片 / 技术栈 / 经历 / 生活 / 关于页
  posts/*.md            #   文章（frontmatter 见上文）
  files/                #   附件（PDF 等，/files/ 直接托管）
  md_images/            #   文章插图原图（构建时自动压缩到 public/md_images）
  changelog/            #   更新日志（访客版）
  projects.json         #   项目
  links.json            #   友链
data/                   # 运行期数据（.gitignore）：blog.db 互动数据、post-index.json 文章清单
lib/                    # 数据层：posts.ts / content.ts / markdown.tsx / site.ts / search.ts / privateContent.ts
                        #   互动：db.ts / analytics.ts / reactions.ts / reactionStore.ts / visitStore.ts / postIndex.ts
                        #   语音：voicePlayer.ts（两个入口共用的播放器单例）
scripts/                # compress-md-images.mjs（压缩配图）、gen-post-index.mjs（生成文章清单）、
                        #   verify-private-crypto.mjs（加密校验）、verify-view-counts.mjs（阅读数端到端校验）
usertools/              # 部署 / 运维脚本（ps1 需 UTF-8 with BOM）
public/
  bg/                   # 背景轮播图（随仓库发布）
  hutao/使用中/          # 开屏素材 + 音效 + 历史录音（随仓库发布，不进部署包）
  hutao/待用库/          # 素材备份库（.gitignore，不随仓库走）
  theme/                # 纹章 / 门扉 / 神之眼 / 火元素 / 胡桃脸（随仓库发布）
  theme/voice/          # 语音池：hutao/ 与 vision/（丢文件即进池）
  md_images/            # 压缩后配图（构建产物，勿手改）
docs/
  user/                 # 使用者指南：内容更新指南 / 启动服务器指南
  dev/                  # 开发文档：整体结构 / 搜索 / 加密 / PDF 预览 / 互动数据
```

## 技术栈

Next.js 15（App Router）· React 19 · TypeScript · gray-matter · remark-gfm / remark-math（KaTeX）· sharp（配图压缩）· pinyin-pro（拼音索引）· pdfjs-dist（移动端 PDF 渲染）· `node:sqlite`（互动数据）

## License

- **源代码**：MIT 协议，见 `LICENSE`。
- **素材（图 / 音频）**：⚠ **不随代码开源**。`public/hutao/`、`public/theme/`、`public/bg/` 下的胡桃 / 原神相关素材版权归 HoYoverse / 米哈游所有，**仅供个人学习与本地演示，禁止商用**；公开发布前请自行替换为你拥有版权或已授权的素材。详见 `版权声明.md`。
