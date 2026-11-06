// ============================================================
// 站点文案 / 配置
//
// 分两层，别再混：
//   1. **可编辑的内容数据**（站点信息 / 首页名片 / 技术栈 / 经历 / 生活 / 关于页）
//      → content/site.json。本文件只负责导入再导出，改数据不用碰代码。
//      下面标「示例」的内容全部换成你自己的即可。
//   2. **界面文案**（导航、按钮、空状态、隐私口径等）
//      → 就在本文件下面，属于界面的一部分，跟着代码走。
//
// 项目与友链数据同样在 content/ 下：projects.json / links.json。
// ============================================================
import siteContent from "../content/site.json";

/** 站点信息：站名 / 副标题 / 页脚（品牌区、页脚、元信息共用） */
export const SITE = siteContent.site;

/** 左侧导航栏（5 项） */
export const NAV = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "文章" },
  { href: "/links", label: "友链" },
  { href: "/projects", label: "项目" },
  { href: "/about", label: "关于" },
];

/** 首页 · 名片（姓名 / 性别 / 生日 / 学校 / 学院 / 专业 / 方向 / 座右铭 / 立绘 / 社交链接） */
export type Hero = {
  name: string;
  gender: string;
  birthday: string;
  school: { name: string; url: string };
  college: { name: string; url: string };
  major: string;
  research: string;
  motto: string;
  avatar: string;
  /** 社交链接（填了才显示；`socials: []` 时整块不渲染） */
  socials: { label: string; href: string }[];
};
export const HERO: Hero = siteContent.hero;

/** 首页 · 技术栈（分组展示，level 为掌握程度 0-100） */
export const TECH = siteContent.tech;

/** 首页 · 经历（时间线） */
export const EXPERIENCE = siteContent.experience;

/** 项目类型：名称 / 地址（可选）/ 描述 / 状态（可选）/ 意义（可选）/ 重要性 */
export type ProjectPriority = "核心" | "重要" | "次要";
export type Project = {
  name: string;
  url?: string;
  desc: string;
  status?: string;
  meaning?: string;
  priority?: ProjectPriority;
  /** 私有项目（仓库未公开等）：卡片换私有纹章并标「需口令」，见 content/projects.json */
  private?: boolean;
};

/** 首页 · 生活（爱好 / 工具等，带喜欢程度或备注） */
export type InterestGroup = {
  name: string;
  items: { label: string; note: string }[];
  /** 分组底部的备注（可选） */
  note?: string;
};
export const INTERESTS: { title: string; groups: InterestGroup[] } =
  siteContent.interests;

/** 首页文章区块文案 */
export const HOME = {
  questsTitle: "最新文章",
  questsMore: "查看全部文章 →",
  empty: "还没有文章，敬请期待。",
};

/** 文章列表页 */
export const POSTS = {
  title: "文章",
  intro: "按时间倒序排列，最新见闻在最上面。",
  empty: "还没有文章，敬请期待。",
  /** 搜索（标题 / 分类 / 标签 / 摘要，均支持拼音） */
  search: {
    placeholder: "搜索文章：标题 / 拼音 / 分类 / 标签 / 摘要",
    clear: "清除",
    back: "← 返回分类浏览",
    empty: "没有找到匹配的文章，换个关键词试试。",
    dropdownEmpty: "没有匹配的文章",
    /** 下拉底部的提示（后面自动接上结果条数） */
    footer: "回车查看全部结果",
    countUnit: " 篇",
    /** 结果页标题前缀，如「搜索结果「复变」· 3 篇」 */
    resultHead: "搜索结果",
    /** 整词命中分类时的提示前缀，如「分类「研究」」 */
    category: "分类",
    /** 命中原因文案（下拉里每条结果右侧的小标签） */
    fields: {
      title: "标题",
      category: "分类",
      slug: "链接",
      tags: "标签",
      excerpt: "摘要",
    },
    pinyin: "拼音",
  },
};

/** 文章详情页 */
export const POST = {
  back: "← 返回文章列表",
  prev: "上一篇",
  next: "下一篇",
};

/** 文章互动的表情种类（key 会写进数据库，只许小写字母） */
export type ReactionKind = "like" | "fire" | "think" | "bulb";

/**
 * 文章互动（点赞 / 多表情反应）。
 * 数字同样客户端拉取；私有文章的处理见 exposePrivateOnCards。
 */
export const REACTIONS = {
  /** 文末互动条的标题 */
  title: "读后留痕",
  /** 引导语 */
  intro: "点一下告诉我这篇读起来如何，再点一次可以取消",
  /** 表情按钮（顺序即展示顺序，第一个是"点赞"） */
  kinds: [
    { key: "like", emoji: "👍", label: "赞" },
    { key: "fire", emoji: "🔥", label: "带劲" },
    { key: "think", emoji: "🤔", label: "有疑问" },
    { key: "bulb", emoji: "💡", label: "学到了" },
  ] as { key: ReactionKind; emoji: string; label: string }[],
  /** 读屏用的一句话（互动条整体） */
  hint: "互动数存在本站自己的服务器上，不接第三方统计。",
  /** 提交失败时的提示 */
  failed: "没记上，稍后再试一次",
  /**
   * 卡片上点赞数的前缀（不用 👍 表情，改成文字 + 神之眼图标）
   * 渲染成「[神之眼] 点赞：12」
   */
  cardLabel: "点赞：",
  /**
   * 「热门」阈值：点赞数 ≥ 这个值时，卡片上的神之眼会**冒火元素纹样**
   * （与开屏进度条加载满时同一种效果，见 components/ui/FireVision.tsx 的 full 态）。
   */
  hotThreshold: 100,
  /**
   * 私有文章是否在文章列表卡片上露出互动数（默认不露）。
   * 详情页解锁后照常可以点、也照常看得到数字。
   * 想让私有文章也出现，把这里改成 true 即可（前端与卡片同时生效）。
   */
  exposePrivateOnCards: false,
};

/** 主题纹章素材（public/theme/，随仓库发布） */
export const THEME_ASSETS = {
  /** 公开内容纹章 */
  sigilPublic: "/theme/hutao-requiem.webp",
  /** 私有 / 加密内容纹章 */
  sigilPrivate: "/theme/qiqi-soul.webp",
  /** 私有文章详情页的门扉（透明底，直接浮在场景上，不要加底衬） */
  door: "/theme/wangsheng-door.webp",
  /** 各纹章的替代文本 */
  altPublic: "公开内容纹章",
  altPrivate: "私有内容纹章",
  /**
   * 返回顶部按钮上的角色脸（创意来源：public/hutao/待用库/ 里那张哈希名图）。
   * **必须放在 public/theme/**——public/hutao 不进部署包。
   */
  hutaoFace: "/theme/hutao-face.webp",

  // ↓ 神之眼 / 火元素纹样：原图在 public/hutao/使用中/小素材/，
  //   这里放 WebP 版——同样是为了不依赖那个"不进部署包"的目录，
  //   开屏、门扉、卡片点赞图标、点击火花现在全走 public/theme/。
  /** 火系神之眼（叩门按钮 / 收窗帘收拢边 / 卡片点赞图标） */
  vision: "/theme/fire-vision.webp",
  /** 火元素图样（神之眼点亮后的外溢粒子 / 点击火花 / 热门文章的发热效果） */
  fire: "/theme/fire-element.webp",

  // ↓ 门扉锁屏复用的开屏素材（与 components/layout/IntroOverlay.tsx 同一套文件）
  /** 开屏第一屏的场景图（门扉锁屏的背景方案，cover 全屏铺满） */
  doorScene: "/hutao/使用中/背景/door.png",
  /** Q版小素材（"起！"那张，开屏 swap 阶段与门扉开启都用它） */
  chibiBurst: "/hutao/使用中/小素材/chibi2.png",
};

/** 悬浮小道具（返回顶部、点击火花、侧边栏神之眼）文案 */
export const WIDGETS = {
  /** 返回顶部按钮的无障碍名称与悬停提示 */
  backToTop: "返回顶部",
  /** 点火花彩蛋的提示（不显示，只给读屏/调试用） */
  sparks: "火元素点击粒子",
  /** 侧边栏那枚神之眼：点一下随机听一句角色台词 */
  visionLabel: "点一下神之眼，听胡桃说句话",
  visionHint: "点它说话",
};

/** 设置面板里的声音相关文案（含「胡桃语音」总开关） */
export const SOUND_UI = {
  title: "设置",
  volumeLabel: "音频音量",
  volumeHint: "作用于开屏音效与胡桃语音",
  voiceLabel: "胡桃语音",
  voiceOn: "开",
  voiceOff: "关",
  voiceHint: "点 Q 版胡桃或侧边栏的神之眼会随机说一句；关掉后两者都不出声（开屏音效不受影响）",
};

/**
 * 访客计数：**开屏「欢迎光临」下面一行 + 左侧导航栏一块**。
 *
 * 显示口径按「今天 / 历史」两组分开，别混着写：
 *   开屏    → 只留一句「你是今日第 N 位旅人」（数字小、有"被认出来"的亲近感）
 *   侧边栏  → 同一句 + 今日翻阅次数 + 历史来访旅人 + 历史翻阅次数（今天/历史各自标清）
 *
 * 数字全部由客户端在 hydrate 后拉取（页面必须保持静态 ○）。
 */
export const VISITS = {
  /** 「你是今日第 N 位旅人」的前半句（开屏与侧边栏共用） */
  ordinalPrefix: "你是今日第",
  ordinalSuffix: "位旅人",
  /** 侧边栏第二行：今日翻阅次数 */
  todayViewsLabel: "今日翻阅次数",
  todayViewsUnit: "次",
  /** 侧边栏第三行：历史来访旅人 */
  totalVisitorsLabel: "历史来访旅人",
  totalVisitorsUnit: "位",
  /** 侧边栏第四行：历史翻阅次数 */
  totalViewsLabel: "历史翻阅次数",
  totalViewsUnit: "次",
  /** 侧边栏小标题 */
  sidebarTitle: "旅人簿",
  /** 数据还没回来时的占位（**不显示假数字**） */
  placeholder: "旅人簿翻页中…",
  /** 接口不可用 / 被限流时的静默提示 */
  unavailable: "旅人簿暂不可用",
  /** 鼠标悬停的隐私口径说明（顺带解释"历史来访旅人"为什么按天算） */
  hint: "只按「IP + 浏览器特征」做当天匿名去重，不存 IP、不写 Cookie；同一个人换一天会各算一位，所以「历史来访旅人」是累计的「访客·天数」。",
};

/**
 * 单篇文章的阅读数。
 *
 * ⚠️ **口径必须写清**：这里是**翻阅次数（PV）**——同一个人多次打开会重复计数
 * （同路径 10 秒内去重），所以文案里**不许**出现"人看过""N 位读者"，
 * 只用「翻阅」这个词，和侧边栏「今日翻阅次数 / 历史翻阅次数」同一套说法。
 *
 * 数字来自 `/api/stats` 的 `posts`（并进 lib/visitStore.ts 的同一份快照，不额外发请求）：
 *   · 一次都没人翻开过的篇目、以及**所有私有文章**（它们不在公开映射里）→ 整块不渲染，不显示 0；
 *   · 数字没回来之前只占位（一个不断版的空格），避免"先撑开再缩回去"的跳动。
 */
export const VISIT_COUNT = {
  /** 标题下那枚只读徽章的前缀（渲染成「翻阅 12 次」） */
  label: "翻阅",
  /** 单位 */
  unit: "次",
  /** 徽章 / 文末那行的悬停提示（口径与隐私一句话讲清） */
  hint: "这篇被翻开的次数（同一路径 10 秒内只记一次，刷新会重复累计）。只保存匿名哈希，不存 IP、不写 Cookie。",
};

/** 私有内容（加密文章 / 私有项目 / 私有友链）的统一文案 */
export const PRIVATE_UI = {
  /** 卡片徽章 */
  badge: "需口令",
  /** 详情页标题旁的小徽章 */
  headBadge: "已加密",
  /** 口令框里的常驻提示（门扉锁屏唯一的一行说明文字） */
  placeholder: "门扉紧闭 叩门需口令",
  /** 叩门按钮的无障碍名称 */
  knock: "叩门",
  /** 口令错误：界面完全无反应，只给读屏留一句话 */
  silentWrong: "门没有动。",
  /** 锁屏左上角的退路 */
  back: "← 返回文章列表",
  /** 解锁后状态条 */
  unlocked: "已解锁",
  /** 解锁后状态条上的补充说明 */
  autoUnlocked: "本次会话已记住口令",
  /** 重新上锁（清掉会话口令，并返回文章卡片界面） */
  relock: "重新上锁",
  /** 叩门中的读屏提示 */
  knocking: "叩门中…",
  /** 非安全上下文（http 非 localhost）时浏览器禁用 WebCrypto */
  insecure: "当前页面不是安全上下文（需要 HTTPS 或 localhost），浏览器禁用了 WebCrypto，无法解密。",
  /** 老浏览器不支持 WebCrypto */
  unsupported: "当前浏览器不支持 WebCrypto，换用新版 Chrome / Edge / Firefox / Safari 再试。",
  /** 本地预览模式提示条（SKIP_ENCRYPT=true） */
  previewNote: "本地预览模式（SKIP_ENCRYPT=true）：本篇未加密，正文明文可见；正式部署会自动加密。",
  /** 私有内容对读者的一句话说明 */
  footnote: "这篇内容默认加密，只有拿到口令的人能读。",
};

/** 关于页（标题 / 引导语 / 三个区块的标题 / 仓库信息 / 胡桃提示） */
export const ABOUT = siteContent.about;

/** 更新日志列表页 */
export const CHANGELOG = {
  title: "更新日志",
  intro: "博客功能更新与修复记录，按时间排列，最新在最上面。",
  empty: "还没有日志，敬请期待。",
  back: "← 返回更新日志",
};
