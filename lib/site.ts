// ============================================================
// 站点文案 / 配置（集中管理）
//
// ★ 站点文案 / 个人资料 / 技术栈 / 经历 / 兴趣都在这里改，组件无需动。
//   项目与友链数据不在代码里：见 content/projects.json 和 content/links.json。
// ============================================================

export const SITE = {
  /** 站点名（侧边栏品牌区 / 页脚 / 元信息） */
  name: "旅行者的见闻录",
  /** 站点一句话描述（侧边栏副标题） */
  description: "一个 AI 学习者的个人博客",
  /** 页脚版权行 */
  footer: "© 2026 旅行者的见闻录",
  /** 页脚建站时间（第二行） */
  builtAt: "建站于 2026.08.10",
};

/** 左侧导航栏（5 项） */
export const NAV = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "文章" },
  { href: "/links", label: "友链" },
  { href: "/projects", label: "项目" },
  { href: "/about", label: "关于" },
];

/** 首页 · 名片 */
export const HERO = {
  /** 姓名 */
  name: "吴天宇",
  /** 性别 */
  gender: "男",
  /** 生日 */
  birthday: "2007.04.10",
  /** 本科学校（官网链接） */
  school: { name: "华中科技大学", url: "https://www.hust.edu.cn/" },
  /** 学院（官网链接） */
  college: {
    name: "人工智能与自动化学院",
    url: "https://aia.hust.edu.cn/",
  },
  /** 专业班级 */
  major: "人工智能 2503 班",
  /** 科研方向 */
  research: "计算机视觉与深度学习",
  /** 座右铭 */
  motto: "海到无边天作岸 山临绝顶我为峰",
  /** 胡桃立绘（9:16 竖长矩形，放内容区最左侧） */
  avatar: "/hutao/使用中/小素材/胡桃立绘.jpg",
  /** 社交链接（填了才会显示，格式 { label, href }） */
  socials: [
    { label: "QQ", href: "https://wpa.qq.com/msgrd?v=3&uin=2864625260&site=qq&menu=yes" },
    { label: "GitHub", href: "https://github.com/PiggyHanHan" },
    { label: "邮箱", href: "mailto:2864625260@qq.com" },
    { label: "学校邮箱", href: "mailto:u202514546@hust.edu.cn" },
  ],
};

/** 首页 · 技术栈（分组展示，level 为掌握程度 0-100） */
export const TECH = {
  title: "技术栈",
  groups: [
    {
      name: "语言",
      items: [
        { name: "C", level: 90 },
        { name: "C++", level: 80 },
        { name: "Python", level: 90 },
        { name: "MATLAB", level: 70 },
      ],
    },
    {
      name: "功能",
      items: [
        { name: "嵌入式开发", level: 50 },
        { name: "模型训练与调优", level: 70 },
        { name: "模型部署与应用开发", level: 60 },
        { name: "数据结构与算法", level: 40 },
      ],
    },
  ],
};

/** 首页 · 经历（时间线） */
export const EXPERIENCE = {
  title: "经历",
  items: [
    {
      date: "2025.06",
      title: "高考",
      text: "考入华中科技大学人工智能与自动化学院",
    },
    {
      date: "2025.10",
      title: "加入实验室",
      text: "联系图像识别与智能科学系左峥嵘老师的实验室，准备提升自己的能力，并带领大创项目",
    },
    {
      date: "2025.11 - 2026.03",
      title: "深度学习入门",
      text: "从 11 月开始初步进行深度学习的尝试，写了几个小项目，详见项目栏",
    },
    {
      date: "2026.02",
      title: "数学建模美赛",
      text: "寒假与同学一起参加数学建模美赛，拿了 S 奖（证书懒得领）",
    },
    {
      date: "2026.03 至今",
      title: "大创项目",
      text: "开学后开启大创项目立项前的推进，这是本人的核心学术成果，延续至今（项目 GitHub 已设私有，详见项目栏）",
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
};

/** 首页 · 个性化（游戏/歌手带喜欢程度，装备为 名称: 值） */
export const INTERESTS = {
  title: "生活",
  groups: [
    {
      name: "爱玩的游戏",
      items: [
        { label: "原神", note: "100%" },
        { label: "我的世界", note: "90%" },
        { label: "终末地", note: "80%" },
      ],
    },
    {
      name: "爱听的歌手",
      items: [
        { label: "林俊杰", note: "100%" },
        { label: "薛之谦", note: "90%" },
        { label: "王力宏", note: "90%" },
        { label: "陶喆", note: "90%" },
        { label: "张杰", note: "80%" },
      ],
      note: "听歌偏好：流行音乐",
    },
    {
      name: "装备与工具",
      items: [
        { label: "agent", note: "Reasonix" },
        { label: "IDE", note: "PyCharm / VS Code" },
      ],
    },
  ],
};

/** 首页文章区块（暂未在首页展示，保留备用） */
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
};

/** 文章详情页 */
export const POST = {
  back: "← 返回文章列表",
  prev: "上一篇",
  next: "下一篇",
};

/** 关于页 */
export const ABOUT = {
  title: "关于",
  intro: "关于吴天宇的一点点介绍。",
  sections: {
    profile: "档案",
    skills: "技能一览",
    writing: "写作方向",
    contact: "联系我",
  },
  profile: "[待填写：自我介绍]",
  skills: ["[待填写：技能 1]", "[待填写：技能 2]", "[待填写：技能 3]"],
  writing: ["[待填写：方向 1]", "[待填写：方向 2]", "[待填写：方向 3]"],
  contactEmail: "[你的邮箱]",
  contactGithub: "[你的 GitHub 链接]",
  cta: "去看看文章 →",
};
