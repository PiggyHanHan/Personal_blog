# AGENTS.md — Personal_blog 项目指南

给 AI 代理 / 开发者的项目速查。**接手本项目先读本文档**。
面向使用者的操作指南见 `docs/user/`，开发文档见 `docs/dev/`（`docs/` 根留计划文档）。

## 环境（Windows + PowerShell）

- **npm 被 `C:\Windows\System32\npm`（0 字节空文件）劫持**：直接 `npm install` 会静默失败且不报错，一律用 `npm.cmd`（如 `npm.cmd install`、`npm.cmd run build`）。
- PowerShell 没有 `&&` / `||`，管道 / 链式命令写法不同。
- 构建：`npm.cmd run build`
- 部署/运维脚本全部收拢在 `usertools/`（自动切到项目根目录，从任意位置调用均可），用法见 `docs/user/启动服务器指南.md`：`local-run.ps1`（本地构建预览）、`sync-content.ps1`（content/ 镜像同步+构建，`-NoBuild` 只传）、`deploy-code.ps1`（代码更新）、`sync-bg.ps1`（换背景图）、`deploy-fresh.ps1`（全新部署，需输 DEPLOY 确认）、`set-private-password.ps1`（单独改私有文章口令，本地+服务器一起改并重建）、`setup-nginx.ps1`（Nginx 一次性配置，配置文件 `nginx-blog.conf`）。**所有 ps1 必须保存为 UTF-8 with BOM**——PowerShell 5.1 会把无 BOM 的 UTF-8 脚本当 ANSI 读，中文注释会破坏解析；远程命令串 `$remote` 用单引号包住，防止 PowerShell 抢先展开 `$(...)`
- 启动（80 端口，公网隧道用）：`node node_modules\next\dist\bin\next start -p 80`
- 本地调试 / 自动化测试：`npm.cmd run start -- -p 3000`（或 `npm.cmd run dev`）
- 公网隧道（Cloudflare）：`& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80 --no-autoupdate`（公网地址每次变）
- **私有文章口令**：构建期环境变量 `PRIVATE_POST_PASSWORD`（本地放 `.env.local`，已被 `.gitignore` 忽略；模板见 `.env.example`）。本地预览默认 `SKIP_ENCRYPT=true`（`local-run.ps1` 自动设，私有文章走明文）；`local-run.ps1 -Encrypt` 走真实加密。**缺口令 + 有私有文章 = 构建失败**（刻意防明文泄露）。改口令/首次配置服务器口令走 `usertools\set-private-password.ps1`（本地+服务器一起改 + 服务器重建；`-Generate` 生成强口令）。校验：`node scripts\verify-private-crypto.mjs`

## 目录结构（2026-08 优化后）

```
app/                    # 页面（Next.js App Router）
  posts/page.tsx        # 文章列表页（静态 ○，勿加服务端 searchParams）
  posts/[slug]/page.tsx # 文章详情页（SSG，generateStaticParams；私有文章换成 PrivateGate 门扉）
  api/view|download|voices/  # PDF 内联预览 / 下载 / 音效
components/
  layout/               # 站点外壳：IntroOverlay(开屏)、BlogBackground、SettingsButton
  providers/            # 全局状态：BgProvider(背景)、SoundProvider(音量/音效)
  hooks/                # useIntroSounds
  home/ post/ projects/ site/ ui/   # 页面卡片 / 文章组件(PostSearch 搜索、PrivateGate 门扉) / 站点布局 / 基础 UI(Sigil 纹章)
content/                # 数据源（改内容不碰代码；创作者内容全部收拢于此）
  posts/*.md            # 文章（frontmatter: title/slug/date/category/excerpt/tags/pdf/private）
  files/                # 附件（PDF 等）：Nginx /files/ 直接托管或经 /api/view|download 读取
  md_images/            # 文章图片【原图】（构建时自动压缩到 public/md_images）
  changelog/            # 更新日志（访客版）
  projects.json         # 项目（private: true = 私有项目）
  links.json            # 友链（private: true = 私有友链）
lib/                    # 数据层：posts.ts(md)、content.ts(json)、markdown.tsx(md→Block)、site.ts(站点配置/文案)
                        #   检索：search.ts(纯匹配逻辑，服务端/浏览器通用)、searchIndex.ts(构建期拼音索引)
                        #   私有文章：privateCrypto.ts(参数/同构工具)、privateContent.ts(构建期加密)、postHtml.ts(Block→HTML)
docs/ user/ dev/        # 使用者指南 / 开发文档（`docs/` 根留计划文档）
scripts/                # compress-md-images.mjs（构建前压缩配图）、verify-private-crypto.mjs（加密链路校验）
usertools/              # 部署/运维脚本（各场景一条命令；ps1 必须 UTF-8 with BOM，见上文）
public/                 # 静态资源（bg 背景轮播、friends 友链头像、hutao 开屏素材、border 装饰边框、theme 胡桃纹章与门扉）＋构建产物 md_images
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

4. **文章页搜索＝构建期拼音索引 + 浏览器端匹配**：拼音转换只在构建时用 `pinyin-pro`（`lib/searchIndex.ts`，服务端）跑一次，索引随静态页序列化给客户端；`lib/search.ts` 是纯函数（服务端/浏览器通用），**不要把 `pinyin-pro` / `node:fs` 引到客户端组件里**。搜索状态（关键词、结果）全在客户端组件 `components/post/PostSearch.tsx` 里，**不写 URL、不读服务端 searchParams**，`/posts` 保持静态渲染（○）；回车提交后才用 `.quest-board` + `QuestCard` 渲染整页结果（卡片样式与分类 tab 完全一致）。详见 `docs/dev/文章搜索.md`。

5. **私有文章＝构建期 AES-256-GCM 加密正文**：frontmatter `private: true`（或 tag `private`/`私有`/`加密`）→ 正文加密成密文随静态页下发，详情页由客户端组件 `components/post/PrivateGate.tsx` 输口令解密。锁屏是**整屏接管**的往生堂门扉，复用开屏那一套（虚化背景 `.intro-white-bg` + `useBg()`、Q版胡桃 `chibi2.png`、`FireVision` 神之眼、收窗帘 `clip-path`）；开门走"门扉淡出 → 胡桃 + `起！` → **等音频放完**才卷门帘"三拍，不许抢拍。口令错误**界面无反应**（只写给读屏）。「重新上锁」= 清会话口令 + 回 `/posts?post=<slug>`。元数据（标题/日期/分类/摘要/标签）保持明文，列表页 / 搜索 / 上一篇下一篇照常工作。
   - 口令只在构建机：`.env.local` 的 `PRIVATE_POST_PASSWORD`，**不进产物、不进 Git**；缺配置就**直接构建失败**，不许静默降级成明文。
   - **Next 禁止在服务端组件图里 `import react-dom/server`**（构建报错），所以正文 HTML 由自写的 `lib/postHtml.ts` 序列化——它必须与 `components/post/PostBody.tsx` **同构**，改一边记得改另一边。
   - 本地预览（`local-run.ps1` 默认 `SKIP_ENCRYPT=true`）走明文；`-Encrypt` 走真实加密。构建后用 `node scripts\verify-private-crypto.mjs` 校验（解真密文 + 扫明文泄漏）。
   - 纹章素材在 `public/theme/`（**不要**放 `public/hutao/`：那个目录被 gitignore、也不进部署包）；纹章绝对定位骑在卡片右下角，**改它的尺寸/偏移要同步改 `.quest-board` / `.project-list` / `.friend-list` 的 gap**。详见 `docs/dev/私有文章加密.md`。

## 内容更新（改文件即可，不碰代码）

- 文章：`content/posts/*.md`，frontmatter 含 `title/slug/date/category/excerpt/tags/pdf`；`category: 研究|工程|生活`（缺省归生活），文章页按此分「研究文章/工程文章/生活文章」三个顶部 tab（从左到右）；**slug 必须英文字母/数字/下划线/连字符**（中文 slug 详情页 404）。
- 项目：`content/projects.json`（`featured` + `projects.columns`）；友链：`content/links.json`。
- 详情页 PDF 内联预览：`/api/view/<相对路径>`（`Content-Disposition: inline`）；下载入口：正文里 `/files/*.pdf` 链接。PDF 文件放 `content/files/`（Nginx `/files/` 直接托管，或经 `/api/view`、`/api/download` 读取）。改了文章正文需重新构建；只替换同名 PDF 文件可不用构建。
- **文章图片**：原图放 `content/md_images/`，md 里写相对路径 `../md_images/xxx.png`（同一路径两处通：本地/GitHub 预览解析到 `content/md_images/` 看原图；网站详情页等二级路径解析到 `/md_images/xxx.png` 看压缩图）。`npm.cmd run build` 前自动执行 `scripts/compress-md-images.mjs` 压缩到 `public/md_images/`（同名文件、等比缩放到最长边 1600px、png 量化/mozjpeg、gif 原样拷贝、只压变更、清理残留），也可手动 `node scripts/compress-md-images.mjs`。正文**连续图片行自动合成网格**：同一行多张图并排且等宽等高对齐，连续多行组成矩阵，窄屏自动单列竖排。改完需重新构建。
- **日志一式两份**：开发者详细日志写 `logs/<日期>.md`（给自己，含技术坑/下一步）；访客版提炼进 `content/changelog/<日期>.md`（给外面的，frontmatter 含 `title/date/excerpt`，只写功能更新与修复）——关于页顶部预览最近一次，点「查看全部」进 `/changelog` 卡片列表，再点卡片进每日详情。改完需重新构建。

## 测试注意

- Playwright / 自动化验证时**开屏动画遮罩（IntroOverlay）会拦截所有点击**：用 `?skipIntro=1` 跳过，或先点「开屏动画，点击任意位置进入」等其消失（`intro-overlay--done`）再操作。
- 已知 404（与功能无关）：开屏音效 `door-open.wav` 素材缺失、`favicon.ico`。
- 验证导航是否发生整页刷新：`performance.getEntriesByType('navigation')` 的 `timeOrigin` 变化即整页导航（SPA 导航不变）。

## 工具漏洞
- 不再调用remember/memory 工具，该工具有可能导致Reasonix崩溃
