// ============================================================
// 文章检索索引（仅在服务端 / 构建时运行）
//
// 这里用 pinyin-pro 把标题、分类、slug、标签、摘要转成"全拼 + 首字母拼音"，
// 编成 SearchDoc 交给文章页的客户端组件。因为页面是静态预渲染（○），
// 索引会随 HTML 一起生成，浏览器只负责子串匹配，不加载任何拼音库。
//
// 只依赖 pinyin-pro（+ 纯函数的 lib/search.ts），输入是文章摘要数组，
// 不碰文件系统，方便单独跑脚本验证。
// ============================================================
import { pinyin } from "pinyin-pro";
import type { PostSummary } from "./posts";
import {
  normalize,
  normalizeSyllables,
  type FieldIndex,
  type SearchDoc,
} from "./search";

/** 汉字 → 全拼音节串（fu bian han shu）；first 为 true 时只取声母首字母（fbhs） */
function toPinyin(text: string, first = false): string {
  const parts = pinyin(text, {
    type: "array",
    toneType: "none",
    pattern: first ? "first" : "pinyin",
    // 英文/数字原样保留（DLSS 5 → DLSS 5），随后统一归一化
    nonZh: "consecutive",
    // ü → v（女 → nv），与用户习惯的输入方式一致
    v: true,
  });
  // 全拼按音节用空格分隔，匹配时要求落在音节边界上（见 lib/search.ts）
  return first
    ? normalize(parts.join(""))
    : normalizeSyllables(parts.join(" "));
}

/** 一个字段的三种索引形态 */
function buildIndex(text: string): FieldIndex {
  return { text: normalize(text), py: toPinyin(text), init: toPinyin(text, true) };
}

/** 把文章摘要编成检索文档（顺序沿用传入顺序，即日期倒序） */
export function buildSearchDocs(posts: PostSummary[]): SearchDoc[] {
  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    category: post.category,
    excerpt: post.excerpt,
    tags: post.tags,
    pdf: post.pdf,
    private: post.private,
    idx: {
      title: buildIndex(post.title),
      category: buildIndex(post.category),
      // slug 同时索引带连字符与去连字符两种写法：dsh-config / dshconfig 都能命中
      slug: buildIndex(`${post.slug} ${post.slug.replace(/-/g, " ")}`),
      tags: buildIndex(post.tags.join(" ")),
      excerpt: buildIndex(post.excerpt),
    },
  }));
}
