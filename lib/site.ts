// ============================================================
// 站点文案 / 配置（集中管理）
//
// ★ 站点名 / 个人资料 / 技术栈 / 经历 / 兴趣都在这里改，组件无需动。
//   项目与友链数据不在代码里：见 content/projects.json 和 content/links.json。
//   下面标「示例」的内容全部换成你自己的即可。
// ============================================================

export const SITE = {
  /** 站点名（侧边栏品牌区 / 页脚 / 元信息） */
  name: "我的博客",
  /** 站点一句话描述（侧边栏副标题） */
  description: "一个基于 Next.js 的个人博客",
  /** 页脚版权行 */
  footer: "© 2026 我的博客",
  /** 页脚建站时间（第二行） */
  builtAt: "建站于 2026.01.01",
};

/** 左侧导航栏（5 项） */
export const NAV = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "文章" },
  { href: "/links", label: "友链" },
  { href: "/projects", label: "项目" },
  { href: "/about", label: "关于" },
];

/** 首页 · 名片（全部是示例，换成你自己的） */
export const HERO = {
  /** 姓名 */
  name: "你的名字",
  /** 性别 */
  gender: "男",
  /** 生日 */
  birthday: "2000.01.01",
  /** 学校（官网链接） */
  school: { name: "你的学校", url: "https://example.com" },
  /** 学院 / 单位（官网链接） */
  college: {
    name: "你的学院 / 单位",
    url: "https://example.com",
  },
  /** 专业班级 / 身份 */
  major: "你的专业 / 身份",
  /** 研究方向 / 自我介绍一句话 */
  research: "你的方向",
  /** 座右铭 */
  motto: "在这里写一句座右铭",
  /** 个人头像（竖长图，放名片最左侧）。模板默认用胡桃主题立绘，换成你自己的照片即可 */
  avatar: "/hutao/使用中/小素材/胡桃立绘.jpg",
  /** 社交链接（填了才显示，格式 { label, href }；不需要就留空数组） */
  socials: [] as { label: string; href: string }[],
};

/** 首页 · 技术栈（示例，改成你自己的；level 为掌握程度 0-100） */
export const TECH = {
  title: "技术栈",
  groups: [
    {
      name: "语言",
      items: [
        { name: "Python", level: 70 },
        { name: "TypeScript", level: 60 },
        { name: "C++", level: 50 },
      ],
    },
    {
      name: "方向",
      items: [
        { name: "Web 开发", level: 60 },
        { name: "数据科学", level: 50 },
      ],
    },
  ],
};

/** 首页 · 经历（时间线，示例，换成你自己的里程碑） */
export const EXPERIENCE = {
  title: "经历",
  items: [
    {
      date: "2026.01",
      title: "开始写博客",
      text: "用这个模板搭起了自己的博客，开始记录学习与生活。",
    },
    {
      date: "2026.02",
      title: "第二条时间线",
      text: "示例经历，改成你自己的里程碑。",
    },
  ],
};

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

/** 首页 · 生活（示例：爱好 / 工具等，带喜欢程度或备注） */
export type InterestGroup = {
  name: string;
  items: { label: string; note: string }[];
  /** 分组底部的备注（可选） */
  note?: string;
};
export const INTERESTS: { title: string; groups: InterestGroup[] } = {
  title: "生活",
  groups: [
    {
      name: "爱好",
      items: [
        { label: "示例：阅读", note: "100%" },
        { label: "示例：写作", note: "80%" },
      ],
    },
    {
      name: "装备与工具",
      items: [
        { label: "IDE", note: "VS Code" },
        { label: "终端", note: "Windows Terminal" },
      ],
    },
  ],
};

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

  // ↓ 门扉锁屏复用的开屏素材（与 components/layout/IntroOverlay.tsx 同一套文件）
  /** 开屏第一屏的场景图（门扉锁屏的背景，cover 全屏铺满） */
  doorScene: "/hutao/使用中/背景/door.png",
  /** Q版小素材（"起！"那张，开屏与门扉开启都用它） */
  chibiBurst: "/hutao/使用中/小素材/chibi2.png",
  /** 神之眼（叩门按钮 / 收窗帘收拢边） */
  vision: "/hutao/使用中/小素材/火系神之眼.png",
  /** 火元素图样（神之眼周围外溢的粒子） */
  fire: "/hutao/使用中/小素材/火元素图样.png",
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

/** 关于页 */
export const ABOUT = {
  title: "关于",
  intro: "关于这个博客的一点点介绍。",
  sections: {
    changelog: "博客更新日志",
    repo: "本站仓库",
    doll: "小玩偶",
  },
  /** 本站源码仓库（GitHub）——改成你自己的仓库地址 */
  repoUrl: "https://github.com/你的用户名/你的仓库",
  repoDesc: "本站源码托管在 GitHub，欢迎交流。把这里改成你自己的仓库地址。",
  /** 底部小玩偶的提示语 */
  dollHint: "点我说话（记得开声音）",
  /** 更新日志区块：最近一次日志下的入口文案 */
  changelogMore: "查看全部更新日志 →",
  /** 更新日志区块的引导语（显示在最近一次日志标题上方） */
  changelogIntro: "最近一次更新",
};

/** 更新日志列表页 */
export const CHANGELOG = {
  title: "更新日志",
  intro: "博客功能更新与修复记录，按时间排列，最新在最上面。",
  empty: "还没有日志，敬请期待。",
  back: "← 返回更新日志",
};
