# AGENTS.md — Personal_blog 项目指南

给 AI 代理 / 开发者的项目速查。**接手本项目先读本文档**。
面向使用者的操作指南见 `docs/user/`，开发文档见 `docs/dev/`（`docs/` 根留计划文档）。

## 环境（Windows + PowerShell）

- **Node.js ≥ 22.13**：互动数据用内置 `node:sqlite`（22.5 以下没有这个模块，22.13 起不需要 `--experimental-sqlite`）。
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
  api/view|download|voices/  # PDF 内联预览 / 下载 / 语音池枚举
  api/stats|like/       # 访客上报与统计 / 点赞与表情（都是 ƒ 动态）
components/
  layout/               # 站点外壳：IntroOverlay(开屏)、BlogBackground、SettingsButton、BackToTop、FireSparks
  interaction/          # VisitReporter(只上报) / VisitorLine(旅人簿) / CardLikes / ReactionBar / ReactionSummary / ViewCount
  providers/            # 全局状态：BgProvider(背景)、SoundProvider(音量 + 胡桃语音开关)
  hooks/                # useIntroSounds
  home/ post/ projects/ site/ ui/   # 页面卡片 / 文章组件(PostSearch 搜索、PrivateGate 门扉) / 站点布局 / 基础 UI(Sigil 纹章)
content/                # 数据源（改内容不碰代码；创作者内容全部收拢于此）
  site.json             # 站点信息 / 首页名片 / 技术栈 / 经历 / 生活 / 关于页（lib/site.ts 只做导入导出）
  posts/*.md            # 文章（frontmatter: title/slug/date/category/excerpt/tags/pdf/private）
  files/                # 附件（PDF 等）：Nginx /files/ 直接托管或经 /api/view|download 读取
  md_images/            # 文章图片【原图】（构建时自动压缩到 public/md_images）
  changelog/            # 更新日志（访客版）
  projects.json         # 项目（private: true = 私有项目）
  links.json            # 友链（private: true = 私有友链）
data/                   # 运行期数据（.gitignore）：blog.db(互动数据)、post-index.json(构建期文章清单)
lib/                    # 数据层：posts.ts(md)、content.ts(json)、markdown.tsx(md→Block)、site.ts(界面文案 + site.json 导入)
                        #   检索：search.ts(纯匹配逻辑，服务端/浏览器通用)、searchIndex.ts(构建期拼音索引)
                        #   私有文章：privateCrypto.ts(参数/同构工具)、privateContent.ts(构建期加密)、postHtml.ts(Block→HTML)
                        #   互动：db.ts(SQLite 连接/建表)、analytics.ts(访客统计)、reactions.ts(点赞/表情)、
                        #         postIndex.ts(构建期清单/ slug 白名单)、reactionStore.ts + visitStore.ts(浏览器端共享快照)
                        #   语音：voicePlayer.ts(两个入口共用的播放器单例)
docs/ user/ dev/        # 使用者指南 / 开发文档（`docs/` 根留计划文档）
scripts/                # compress-md-images.mjs（压缩配图）、gen-post-index.mjs（生成文章清单）、
                        #   verify-private-crypto.mjs（加密链路校验）、verify-view-counts.mjs（阅读数端到端校验）
usertools/              # 部署/运维脚本（各场景一条命令；ps1 必须 UTF-8 with BOM，见上文）
public/                 # 静态资源（bg 背景轮播、friends 友链头像、hutao 开屏素材、theme 纹章/门扉/语音池）＋构建产物 md_images
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
   - 纹章素材在 `public/theme/`（**不要**放 `public/hutao/`：那个目录不进部署包）；纹章绝对定位骑在卡片右下角，**改它的尺寸/偏移要同步改 `.quest-board` / `.project-list` / `.friend-list` 的 gap**。详见 `docs/dev/私有文章加密.md`。

6. **文章 / 日志解析必须走缓存入口（`loadAllPosts()` / `loadAllChangelog()`）**：Next 预渲染时**每个页面**都会分别调用 `generateStaticParams` / `generateMetadata` / 页面组件 / `PostNav`，每次都把全部 Markdown 重新解析一遍——实测 25 篇文章、一次构建调用 **78 次**，其中 **76 次是纯重复劳动**。而私有文章每次解析都要重跑 PBKDF2（25 万次迭代，全量解析一次约 4s），于是构建耗时随「文章数 × 私有文章数」近似平方增长：**加缓存前 112s → 加缓存后 38s**。
   - `parseAllPosts()` / `parseAllChangelog()` 是纯计算，**不要直接调用**；只由带缓存的 `loadAllPosts()` / `loadAllChangelog()` 调用。
   - `getAllPosts()` / `getChangelogEntries()` 必须写成 `[...loadAllPosts()].sort(...)`：`sort` 是原地排序，别把缓存数组本身排乱。
   - `next dev` 下刻意不缓存（改 md 立刻生效）；生产构建 / 服务进程才缓存——内容变了本来就要重新构建。
   - `usertools\deploy-code.ps1` 清 `.next` 时必须保留 `.next/cache`（webpack 缓存，约 120MB）：删掉它每次代码更新都退化成冷编译，多花约 20s。

7. **互动数据（访客 / 点赞 / 表情）＝ `node:sqlite` 落盘 + 客户端拉取**：库在 `data/blog.db`（本地与服务器各一份），表结构**只在 `lib/db.ts` 的 `SCHEMA` 里写一份**。
   - **`data/` 是运行期数据，三条规矩不许破**：不加进 `usertools\deploy-light.ps1` 白名单（本地空目录会覆盖线上数据）、不在 `deploy-code.ps1` 的 `rm -rf` 列表里（数据要活过代码更新）、`.gitignore` 里的 `/data/` 不许删。
   - **`node:sqlite` 必须用 `process.getBuiltinModule("node:sqlite")` 取**，不要写成静态 `import { DatabaseSync } from "node:sqlite"`：`module.builtinModules` 里**没有** `sqlite`（只有 `isBuiltin("node:sqlite")` 为真），打包器会把它判成"模块不存在"。
   - **互动 API 绝对不许 import `lib/posts.ts`**：那会触发全量 Markdown 解析 + 每篇私有文章 25 万次 PBKDF2（一个请求拖住进程，见第 6 条）。slug 白名单走**构建期清单** `data/post-index.json`（`scripts/gen-post-index.mjs`，挂在 `prebuild`/`predev` 上），由 `lib/postIndex.ts` 读取，缺文件时退化为只扫 frontmatter。
   - **数字一律客户端拉**：`/posts` 必须保持 ○，侧边栏「旅人簿」/ 卡片赞数 / 文末互动条都在 hydrate 之后取数；计数放在 `lib/reactionStore.ts` 的模块级单例里，全站只发**一次** `GET /api/like`（用 `useSyncExternalStore`，`getServerSnapshot` 必须是模块级常量）。
   - **真实 IP 只信 `X-Real-IP`**；XFF 兜底取**最后一段**——nginx 的 `$proxy_add_x_forwarded_for` 是**追加**语义，首段由访客自己填、可随意伪造。IP 绝不落库，只存 `sha256(ip + ua + salt + 当天)`，盐在库的 `meta` 表里随机会生成。
   - **私有文章**：互动条放在 `PrivateGate` 的 children 里（锁着时连按钮节点都不存在），列表卡片不露其赞数（`lib/site.ts` 的 `REACTIONS.exposePrivateOnCards`）。
   - **nginx 限流只加在 `/api/stats`、`/api/like` 两个精确路径上**，别写 `location ^~ /api/`：`/api/view` 会被 pdf.js 用大量 Range 请求打，限流会打断手机端 PDF 阅读。`nginx-blog.conf` 与服务器那份是**双份**，改一处必须同步（`setup-nginx.ps1 -SkipCert`）。
   - 完整设计、隐私口径与验收记录见 `docs/dev/互动数据.md`。

8. **趣味互动与数字显示的硬规矩**：
   - **火元素粒子（`components/layout/FireSparks.tsx`）与返回顶部（`components/layout/BackToTop.tsx`）都挂 `app/layout.tsx`，`z-index` 都取 900**：要盖得住正文，但必须**低于**往生堂门扉（9000）/ 开屏（9999）/ 设置按钮（10000）——否则会在全屏仪式上浮一个按钮出来。
   - **⚠️ 设置按钮实际在右下角**：`globals.css` 的 `.settings-wrap` 写的是 `left: 16px`，但 **`blog.css` 末尾有一条覆盖把它挪到了右下角**（左侧已有导航栏）。所以返回顶部放 `right: 72px`（与设置按钮并排、间隔 12px）；`right: 16px`（两个圆钮叠住）和 `left: 16px`（压住侧边栏版权行）都不行。
   - **火元素纹样（`.intro-fire-particle`）三条规矩**：① **只许位移、不许旋转**——方向必须在 JS 里换算成 `--dx/--dy`（`components/ui/FireVision.tsx` 的 `makeEmbers()`），**不要**写成 `rotate(var(--dir)) translateX(...)`（会把纹样本身转掉）；② **每颗粒子的时长/延迟/距离/尺寸都要随机**，动画用 `@keyframes ember-fly`（与点击火花共用）；③ 粒子 `z-index: 1`，必须低于 `.intro-vision` 的 2——火从宝石背后冒出来。粒子必须在**挂载后**再生成（`useEffect`，别用 `useMemo` 直接 `Math.random()`，否则 SSR 与水合的内联样式对不上）。
   - **卡片点赞图标的尺寸**：`1.35em`（比文字大）。两种状态（普通 / 热门）用同一个尺寸、同一个竖直中线，热门态的火在后面飘。
   - **素材**：胡桃脸 `public/theme/hutao-face.webp`、火系神之眼 `fire-vision.webp`、火元素纹样 `fire-element.webp` 都在 **`public/theme/`**（部署包白名单 + git 跟踪）。`public/hutao/待用库/` 那批图**不进部署包**，要用必须先复制过来；注意那批图里 `火元素图样.jpeg` / 那张哈希名脸图**真身都是 PNG/WebP，扩展名是骗人的**。
   - **互动数字的三处显示分工**：开屏欢迎语下一行 + 侧边栏「旅人簿」= 访客数（`lib/visitStore.ts` 单例，`VisitReporter` 只上报一次）；标题下一枚只读徽章 + 文末可点互动条 = 反应数（`lib/reactionStore.ts` 单例，全站只发一次 `GET /api/like`）；卡片右下角 = 神之眼 + 「点赞：N」，**赞数 ≥ `REACTIONS.hotThreshold`（100）时换成 `<FireVision full compact>` 冒火**。页脚不放这些数字。
   - **单篇阅读数＝ `posts` 映射 + 只读徽章**：`/api/stats` 响应里那个 `posts: { slug: PV }`（`publicViewCounts()` 算的）搭 `VisitReporter` 那次 `POST` 的顺风车并进 `lib/visitStore.ts` 的**同一份快照**（`usePostViewCount()`），`components/interaction/ViewCount.tsx` 在**标题下 + 文末互动条**两处只读显示。三条不许改：① 这是**翻阅次数（PV）**不是人数——文案只有「翻阅 N 次」，一个"人"字都不许有；② **零值整块不渲染**（别显示 `0`）；③ **私有文章一律不显示**（锁着 / 错口令 / 解锁后都不显示）。另外：**全站仍然只有一次 stats + 一次 like**，别为这个数字再开第三个请求；列表卡片刻意不显示。校验脚本 `node scripts/verify-view-counts.mjs`（真浏览器，跑完自动清理测试数据）。
   - **访客数只按「今天 / 历史」两组给**（`/api/stats` 返回 `{ today:{visitors,views}, total:{visitors,views} }`）：开屏只留一句「你是今日第 N 位旅人」（小数字才有社交气息），侧边栏四行写全。⚠️ 文案里不要再出现"第 N 位""累计翻阅"这类不标口径的说法；`total.visitors` 是**累计「访客·天数」**（哈希带日期、刻意不做长期跟踪），不是独立人数，已在悬浮提示里说明。

9. **胡桃语音（点胡桃 / 点神之眼）＝两个音频池 + 一个共享播放器**：
   - **池子就是目录**：`public/theme/voice/hutao/`（点开屏那张 Q 版胡桃）与 `public/theme/voice/vision/`（点左侧导航栏那枚神之眼），由 `app/api/voices/route.ts?pool=xxx` 动态枚举 —— **往目录里丢音频文件就自动进池子，不用改代码**。
   - **音频必须放 `public/theme/`**：`public/hutao/` 不在部署包白名单里，往里加新音频线上不会生效（历史上能播只是因为当初整包部署过一次）。一律 **mp3 单声道 80kbps**（比 wav 小约 9 倍）。
   - **文件名以 `_` 开头 = 不进随机池**：`_greeting-你很有眼光嘛！.mp3` 是点击开门的欢迎语，由 `useIntroSounds` 的 `SOUND_CANDIDATES.greeting` 定点播放；混进随机池会让同一句连着出现两次。
   - 播放器是 `lib/voicePlayer.ts` 的**模块级单例**：两个入口共用 → 互相打断、不叠音、`/api/voices` 只拉一次。音量与「胡桃语音」总开关由 `SoundProvider` 经 `configureVoice()` 推进去（localStorage 键 `blog.sound.voice`，默认开）。**不要改回"各组件各自 new Audio"**。
   - `components/ui/ElementIcon.tsx` 用 `THEME_ASSETS.vision`；**别再写死 `/hutao/使用中/小素材/...`**（那是未部署目录，全新部署会 404）。

10. **站点卡片数据在 `content/site.json`**：`SITE / HERO / TECH / EXPERIENCE / INTERESTS / ABOUT` 都从那里导入，`lib/site.ts` 只做 `import` 再导出；**界面文案（导航、按钮、空状态、隐私口径）仍留在 `lib/site.ts`**，改数据不要写回代码。新增站点字段：`content/site.json` 直接加 + `lib/site.ts` 补类型（如 `Hero`）即可。

## 内容更新（改文件即可，不碰代码）

- 站点信息 / 首页卡片 / 技术栈 / 经历 / 生活 / 关于页：`content/site.json`（见第 10 条）。
- 文章：`content/posts/*.md`，frontmatter 含 `title/slug/date/category/excerpt/tags/pdf`；`category: 研究|工程|生活`（缺省归生活），文章页按此分「研究文章/工程文章/生活文章」三个顶部 tab（从左到右）；**slug 必须英文字母/数字/下划线/连字符**（中文 slug 详情页 404）。
- 项目：`content/projects.json`（`featured` + `projects.columns`）；友链：`content/links.json`。
- 详情页 PDF 内联预览：`/api/view/<相对路径>`（`Content-Disposition: inline`）；下载入口：正文里 `/files/*.pdf` 链接。PDF 文件放 `content/files/`（Nginx `/files/` 直接托管，或经 `/api/view`、`/api/download` 读取）。改了文章正文需重新构建；只替换同名 PDF 文件可不用构建。
- **文章图片**：原图放 `content/md_images/`，md 里写相对路径 `../md_images/xxx.png`（同一路径两处通：本地/GitHub 预览解析到 `content/md_images/` 看原图；网站详情页等二级路径解析到 `/md_images/xxx.png` 看压缩图）。`npm.cmd run build` 前自动执行 `scripts/compress-md-images.mjs` 压缩到 `public/md_images/`（同名文件、等比缩放到最长边 1600px、png 量化/mozjpeg、gif 原样拷贝、只压变更、清理残留），也可手动 `node scripts/compress-md-images.mjs`。正文**连续图片行自动合成网格**：同一行多张图并排且等宽等高对齐，连续多行组成矩阵，窄屏自动单列竖排。改完需重新构建。
- **日志一式两份**：开发者详细日志写 `logs/<日期>.md`（给自己，含技术坑/下一步）；访客版提炼进 `content/changelog/<日期>.md`（给外面的，frontmatter 含 `title/date/excerpt`，只写功能更新与修复）——关于页顶部预览最近一次，点「查看全部」进 `/changelog` 卡片列表，再点卡片进每日详情。改完需重新构建。

## 测试注意

- Playwright / 自动化验证时**开屏动画遮罩（IntroOverlay）会拦截所有点击**：用 `?skipIntro=1` 跳过，或先点「开屏动画，点击任意位置进入」等其消失（`intro-overlay--done`）再操作。
- **互动相关的两个校验脚本**（都要先起服务）：`node scripts/verify-view-counts.mjs`（真浏览器，断言"全站只有一次 stats + 一次 like"、零值不渲染、私有文章不显示，跑完自动清理测试数据）；`node scripts/verify-private-crypto.mjs`（解真密文 + 扫产物里的明文泄漏）。
- 本地验证互动接口时注意：`GET /api/stats` 不记数，只有 `POST`（页面浏览）才计数；`data/blog.db` 删掉即清零。
- 已知 404（与功能无关）：开屏音效 `door-open.wav` 候选（实际加载的是 `door-open.mp3`）、`favicon.ico`。
- 验证导航是否发生整页刷新：`performance.getEntriesByType('navigation')` 的 `timeOrigin` 变化即整页导航（SPA 导航不变）。

## 工具漏洞
- 不再调用remember/memory 工具，该工具有可能导致Reasonix崩溃
