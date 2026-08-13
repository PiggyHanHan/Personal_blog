# AGENTS.md — Personal_blog 项目指南

给 AI 代理 / 开发者的项目速查。**接手本项目先读本文档**。
面向使用者的操作指南见 `docs/user/`，开发文档见 `docs/dev/`（`docs/` 根留计划文档）。

## 环境（Windows + PowerShell）

- **npm 被 `C:\Windows\System32\npm`（0 字节空文件）劫持**：直接 `npm install` 会静默失败且不报错，一律用 `npm.cmd`（如 `npm.cmd install`、`npm.cmd run build`）。
- PowerShell 没有 `&&` / `||`，管道 / 链式命令写法不同。
- 构建：`npm.cmd run build`
- 启动（80 端口，公网隧道用）：`node node_modules\next\dist\bin\next start -p 80`
- 本地调试 / 自动化测试：`npm.cmd run start -- -p 3000`（或 `npm.cmd run dev`）
- 公网隧道（Cloudflare）：`& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80 --no-autoupdate`（公网地址每次变）

## 目录结构（2026-08 优化后）

```
app/                    # 页面（Next.js App Router）
  posts/page.tsx        # 文章列表页（静态 ○，勿加服务端 searchParams）
  posts/[slug]/page.tsx # 文章详情页（SSG，generateStaticParams）
  api/view|download|voices/  # PDF 内联预览 / 下载 / 音效
components/
  layout/               # 站点外壳：IntroOverlay(开屏)、BlogBackground、SettingsButton
  providers/            # 全局状态：BgProvider(背景)、SoundProvider(音量/音效)
  hooks/                # useIntroSounds
  home/ post/ projects/ site/ ui/   # 页面卡片 / 文章组件 / 站点布局 / 基础 UI
content/                # 数据源（改内容不碰代码）
  posts/*.md            # 文章（frontmatter: title/slug/date/category/excerpt/tags/pdf）
  md_images/            # 文章图片【原图】（构建时自动压缩到 public/md_images）
  projects.json         # 项目
  links.json            # 友链
lib/                    # 数据层：posts.ts(md)、content.ts(json)、markdown.tsx(md→Block)、site.ts(站点配置)
docs/ user/ dev/        # 使用者指南 / 开发文档
public/                 # 静态资源（bg 背景轮播、files 附件 PDF、friends 友链头像、hutao 开屏素材）
types/                  # 全局类型声明（pdfjs-legacy.d.ts）
```

## 不可回退的既定方案（改代码前必读）

1. **`/posts` 必须保持静态渲染（○）**：服务端读 `searchParams` 会使其变成动态页（ƒ）——隧道访问下切换慢，请求失败时还会**降级整页刷新（表现为开屏重播）**。`?post=` 返回定位已移到客户端：`TabbedSections` 用 `useSearchParams` + `slugToTabName` 映射（映射由 `app/posts/page.tsx` 静态计算传入），`posts` / `projects` 页都要用 `<Suspense>` 包裹（useSearchParams 的静态渲染要求）。新增导航页时保持同样的静态化思路。

2. **IntroOverlay 会话去重**：sessionStorage 键 `blog-intro-seen=1` —— 同标签页内任何整页加载（刷新 / 网络抖动降级导航）**不再重播开屏**；新开标签页 / 新会话才正常重播。`?skipIntro=1` 仍可跳过。不要移除这个去重（否则整页刷新会重播完整开屏）。

3. **PDF 手机端方案（已实现）**：小米等国产浏览器不支持 PDF 预览（iframe 一律弹下载）。
   - 桌面：原生 `<iframe src="/api/view/...">`（浏览器内置阅读器）。
   - 手机：`components/post/MobilePdfViewer.tsx` 用 pdf.js（pdfjs-dist **legacy build**，动态 import + worker 静态资源）canvas 渲染。
   - **手机端绝不能渲染 iframe**（即使 CSS 隐藏也会加载 PDF 触发下载弹窗）；移动端判断用 UA + `(pointer: coarse)` + `maxTouchPoints`，不用视口宽度（iPad/折叠屏/电脑模式会误判）。
   - 详情页桌面 iframe 直接加载 8.7MB PDF：隧道下慢属内容本身特性，未做延迟加载。

## 内容更新（改文件即可，不碰代码）

- 文章：`content/posts/*.md`，frontmatter 含 `title/slug/date/category/excerpt/tags/pdf`；`category: 学术|个人`（缺省归个人），文章页按此分「学术文章/个人文章」顶部 tab；**slug 必须英文字母/数字/下划线/连字符**（中文 slug 详情页 404）。
- 项目：`content/projects.json`（`featured` + `projects.columns`）；友链：`content/links.json`。
- 详情页 PDF 内联预览：`/api/view/<相对路径>`（`Content-Disposition: inline`）；下载入口：正文里 `/files/*.pdf` 链接。改完需重新构建。
- **文章图片**：原图放 `content/md_images/`，md 里写相对路径 `../md_images/xxx.png`（同一路径两处通：本地/GitHub 预览解析到 `content/md_images/` 看原图；网站详情页等二级路径解析到 `/md_images/xxx.png` 看压缩图）。`npm.cmd run build` 前自动执行 `scripts/compress-md-images.mjs` 压缩到 `public/md_images/`（同名文件、等比缩放到最长边 1600px、png 量化/mozjpeg、gif 原样拷贝、只压变更、清理残留），也可手动 `node scripts/compress-md-images.mjs`。正文**连续图片行自动合成网格**：同一行多张图并排且等宽等高对齐，连续多行组成矩阵，窄屏自动单列竖排。改完需重新构建。
- **日志一式两份**：开发者详细日志写 `logs/<日期>.md`（给自己，含技术坑/下一步）；访客版提炼进 `content/changelog/<日期>.md`（给外面的，frontmatter 含 `title/date/excerpt`，只写功能更新与修复）——关于页顶部预览最近一次，点「查看全部」进 `/changelog` 卡片列表，再点卡片进每日详情。改完需重新构建。

## 测试注意

- Playwright / 自动化验证时**开屏动画遮罩（IntroOverlay）会拦截所有点击**：用 `?skipIntro=1` 跳过，或先点「开屏动画，点击任意位置进入」等其消失（`intro-overlay--done`）再操作。
- 已知 404（与功能无关）：开屏音效 `door-open.wav` 素材缺失、`favicon.ico`。
- 验证导航是否发生整页刷新：`performance.getEntriesByType('navigation')` 的 `timeOrigin` 变化即整页导航（SPA 导航不变）。

## 工具漏洞
- 不再调用remember/memory 工具，该工具有可能导致Reasonix崩溃
