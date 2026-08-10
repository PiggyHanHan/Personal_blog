# 旅行者的见闻录 —— 胡桃风格个人博客

> 基于 Next.js 的个人博客：胡桃·往生堂"开门"开屏动画（往生堂图 → 白屏加载 + Q版胡桃 + 璃月火系神之眼进度条）+ 各地区风景图随机背景轮播 + 文字背光可读性优化。

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
  IntroOverlay.tsx      # 开屏动画（往生堂"开门" → 白屏加载 → 进入博客）
  BlogBackground.tsx    # 背景轮播（自动读取 public/bg/ 目录）
lib/
  posts.ts              # ★ 文章数据：加新文章就改这个文件
public/
  hutao/                # 开屏素材：door/chibi/bg/vision 四张图（见 README.txt）
  bg/                   # 背景图：往这里丢图片就自动轮播
  intro/                # （旧版视频开屏素材，已废弃，可删除）
```

## 怎么加一篇文章

打开 `lib/posts.ts`，在 `posts` 数组里加一项：

```ts
{
  slug: "my-new-post",                 // 链接会是 /posts/my-new-post
  title: "文章标题",
  date: "2026-02-01",
  excerpt: "列表页显示的摘要一句话",
  tags: ["AI", "笔记"],
  content: ["第一段文字", "第二段文字"], // 每个字符串是一段
},
```

保存后刷新页面，新文章会自动出现在列表页和首页。

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

- **推荐 Vercel**：注册 vercel.com → 导入本项目（或它的 GitHub 仓库）→ 自动构建部署；之后每次更新推送会自动重新构建
- 背景图列表在构建时读取，发布后往 `public/bg/` 加图需要重新构建（dev 模式无此限制）
