// ============================================================
// 文章检索：匹配逻辑（同构模块，服务端建索引 / 浏览器实时匹配都用它）
//
// 设计要点：
//   1. 拼音转换只在构建时做一次（见 lib/searchIndex.ts，服务端 pinyin-pro），
//      结果随静态页面序列化给浏览器；本文件不 import 任何拼音库，
//      所以浏览器端只做字符串子串匹配，首屏体积不受影响。
//   2. 每个字段存三份索引：text（原文归一化）/ py（全拼）/ init（首字母拼音）。
//      「复变函数」「fubian」「fbhsxxjl」「fbhs」都能命中同一篇文章。
//   3. 检索字段：标题 / 分类 / 链接 slug / 标签 / 摘要，权重依次递减。
//   4. 分类整体命中（输入「研究」「yanjiu」）→ 直接列出该分类全部文章。
// ============================================================
import type { PostCategory } from "./posts";

/** 参与检索的字段（顺序即优先级展示顺序） */
export const SEARCH_FIELDS = [
  "title",
  "category",
  "slug",
  "tags",
  "excerpt",
] as const;
export type SearchField = (typeof SEARCH_FIELDS)[number];

/** 命中方式：原文 / 全拼 / 首字母拼音 */
export type MatchKind = "text" | "py" | "init";

/** 单个字段的检索索引 */
export type FieldIndex = {
  /** 原文（小写、去空格标点） */
  text: string;
  /** 全拼（按音节用空格分隔、去声调）：复变函数 → fu bian han shu */
  py: string;
  /** 首字母拼音（无分隔）：复变函数 → fbhs */
  init: string;
};

/** 传给浏览器的检索文档：文章摘要信息 + 预先算好的索引 */
export type SearchDoc = {
  slug: string;
  title: string;
  date: string;
  category: PostCategory;
  excerpt: string;
  tags: string[];
  pdf?: string;
  /** 私有文章（卡片上显示"需口令"徽章与七七纹章） */
  private: boolean;
  idx: Record<SearchField, FieldIndex>;
};

/** 命中原因（用于下拉框里显示"为什么匹配"） */
export type SearchReason = { field: SearchField; kind: MatchKind };

export type SearchHit = { doc: SearchDoc; score: number; reason: SearchReason };

/** 分类整体命中的统一分数（保证排在关键词命中之前） */
const CATEGORY_ALL_SCORE = 100000;

/** 各字段权重：原文 / 全拼 / 首字母 */
const FIELD_WEIGHTS: Record<SearchField, { text: number; py: number; init: number }> = {
  title: { text: 100, py: 74, init: 58 },
  category: { text: 92, py: 62, init: 46 },
  slug: { text: 64, py: 0, init: 0 },
  tags: { text: 50, py: 34, init: 28 },
  excerpt: { text: 36, py: 24, init: 18 },
};

const EXACT_BONUS = 40;
const PREFIX_BONUS = 18;

/**
 * 归一化：ü → v、去声调、全角转半角、转小写、去空格与标点。
 * 只保留汉字 / 字母 / 数字，便于「DLSS 5」与「dlss5」、「u(x,y)」与「uxy」互相命中。
 */
export function normalize(input: string): string {
  return input
    .replace(/[üǖǘǚǜ]/g, "v")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** 同上，但保留单个空格作为音节分隔（全拼索引用） */
export function normalizeSyllables(input: string): string {
  return input
    .replace(/[üǖǘǚǜ]/g, "v")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** 去掉音节分隔（比较"整词是否等于某分类的拼音"时用） */
export function compactPinyin(py: string): string {
  return py.replace(/\s+/g, "");
}

/** 按空格切词并归一化（多关键词是"与"关系） */
export function tokenize(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);
}

/** 原样切词（保留标点与大小写，用于标题高亮） */
export function rawTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** 关键词变体：额外容忍「研究文章」→「研究」这种带后缀的输入 */
function tokenVariants(token: string): string[] {
  const variants = [token];
  const noSuffix = token.replace(/文章$/, "");
  if (noSuffix && noSuffix !== token) variants.push(noSuffix);
  return variants;
}

/** py 里第 index 个紧凑字符是否落在音节边界上（拼音串按空格分音节存储） */
function isSyllableStart(py: string, index: number): boolean {
  let count = 0;
  for (let i = 0; i < py.length; i += 1) {
    if (py[i] === " ") continue;
    if (count === index) return i === 0 || py[i - 1] === " ";
    count += 1;
  }
  return false;
}

/**
 * 全拼匹配：必须落在音节边界上，避免跨音节误命中。
 * 例：标题里的「3D视觉」拼成 3d shi jue，输入 dsh 不会命中（d|sh 跨音节），
 * 而「函数」hanshu、「复变」fubian、「xuexi」这类从音节开头的输入都能命中。
 */
function matchPinyin(py: string, token: string, weight: number): number | null {
  const compact = compactPinyin(py);
  const at = compact.indexOf(token);
  if (at < 0) return null;
  if (at === 0) {
    return compact === token ? weight + EXACT_BONUS : weight + PREFIX_BONUS;
  }
  return isSyllableStart(py, at) ? weight : null;
}

/** 单个索引串的匹配打分；short 为真时（单字符）首字母不做中间匹配，避免噪声 */
function matchField(
  kind: MatchKind,
  hay: string,
  token: string,
  weight: number,
  short: boolean
): number | null {
  if (!hay || !weight || !token) return null;
  if (kind === "py") return matchPinyin(hay, token, weight);
  if (hay === token) return weight + EXACT_BONUS;
  if (hay.startsWith(token)) return weight + PREFIX_BONUS;
  if (short && kind === "init") return null;
  return hay.includes(token) ? weight : null;
}

/** 一个关键词对一篇文章的最佳命中（跨字段取最高分） */
function scoreToken(
  doc: SearchDoc,
  token: string
): { score: number; reason: SearchReason } | null {
  const short = token.length < 2;
  let best: { score: number; reason: SearchReason } | null = null;

  for (const field of SEARCH_FIELDS) {
    const idx = doc.idx[field];
    const weight = FIELD_WEIGHTS[field];
    const kinds: [MatchKind, string, number][] = [
      ["text", idx.text, weight.text],
      ["py", idx.py, weight.py],
      ["init", idx.init, weight.init],
    ];
    for (const [kind, hay, w] of kinds) {
      const score = matchField(kind, hay, token, w, short);
      if (score !== null && (!best || score > best.score)) {
        best = { score, reason: { field, kind } };
      }
    }
  }

  return best;
}

/** 排序：分数高者在前，同分按日期新者在前 */
function sortHits(hits: SearchHit[]): SearchHit[] {
  return hits
    .slice()
    .sort((a, b) => b.score - a.score || (a.doc.date < b.doc.date ? 1 : -1));
}

export type SearchResult = {
  hits: SearchHit[];
  /** 整词命中分类时给出分类名（结果页提示"分类「研究」"） */
  category?: PostCategory;
};

/**
 * 检索入口。
 * - 关键词是"与"关系：每个词都要命中某个字段，否则整篇不算命中；
 * - 整词恰好等于分类名（原文或全拼）时，直接返回该分类全部文章。
 */
export function searchDocs(docs: SearchDoc[], query: string): SearchResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { hits: [] };

  // 分类整体命中：研究 / 工程 / 生活，或 yanjiu / gongcheng / shenghuo
  const whole = tokens.join("");
  const catDoc = docs.find(
    (d) =>
      d.idx.category.text === whole ||
      compactPinyin(d.idx.category.py) === whole
  );
  if (catDoc) {
    const category = catDoc.category;
    const kind: MatchKind = catDoc.idx.category.text === whole ? "text" : "py";
    return {
      category,
      hits: sortHits(
        docs
          .filter((d) => d.category === category)
          .map((doc) => ({
            doc,
            score: CATEGORY_ALL_SCORE,
            reason: { field: "category" as SearchField, kind },
          }))
      ),
    };
  }

  const hits: SearchHit[] = [];
  for (const doc of docs) {
    let total = 0;
    let best: { score: number; reason: SearchReason } | null = null;

    for (const token of tokens) {
      let tokenBest: { score: number; reason: SearchReason } | null = null;
      for (const variant of tokenVariants(token)) {
        const found = scoreToken(doc, variant);
        if (found && (!tokenBest || found.score > tokenBest.score)) {
          tokenBest = found;
        }
      }
      if (!tokenBest) {
        total = 0;
        break;
      }
      total += tokenBest.score;
      if (!best || tokenBest.score > best.score) best = tokenBest;
    }

    if (total > 0 && best) {
      hits.push({ doc, score: total, reason: best.reason });
    }
  }

  return { hits: sortHits(hits) };
}
