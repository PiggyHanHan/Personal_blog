// ============================================================
// 私有文章加密 · 端到端校验
//
// 用法：node scripts/verify-private-crypto.mjs [--dist=.next] [--password=xxx]
//
// 做三件事：
//   1. 从构建产物里抽出每篇私有文章实际下发的载荷（页面内联的那串密文）；
//   2. 用 Node 的 WebCrypto（与浏览器同一套 crypto.subtle、同样的 PBKDF2/AES-GCM 参数）
//      拿 .env.local 的口令解密，断言解出来的 HTML 与源 Markdown 对得上；
//   3. 扫遍构建产物，断言正文原文一句都没有以明文出现。
//
// 全部通过退出码 0；任何一项失败退出码 1（可直接挂到 CI / 部署前检查）。
// ============================================================
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { webcrypto } from "node:crypto";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const DIST = path.resolve(ROOT, arg("dist", ".next"));
const POSTS_DIR = path.join(ROOT, "content", "posts");

/** 从 .env.local / .env.production / .env 里读口令（后者优先级低） */
function loadPassword() {
  const cli = arg("password", "");
  if (cli) return { password: cli, from: "命令行 --password" };
  for (const file of [".env.local", ".env.production", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = /^\s*PRIVATE_POST_PASSWORD\s*=\s*(.*)$/.exec(line);
      if (m) {
        const value = m[1].trim().replace(/^["']|["']$/g, "");
        if (value) return { password: value, from: file };
      }
    }
  }
  return { password: "", from: "" };
}

/** 极简 frontmatter 读取（只要 private / slug / title 三个字段） */
function readFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  const head = m ? m[1] : "";
  const body = m ? raw.slice(m[0].length) : raw;
  const field = (key) => {
    const hit = new RegExp(`^${key}\\s*:\\s*(.+)$`, "m").exec(head);
    return hit ? hit[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  return {
    isPrivate: /^private\s*:\s*true\s*$/im.test(head),
    slug: field("slug"),
    title: field("title"),
    pdf: field("pdf"),
    frontmatter: head,
    body,
  };
}

/** 递归列出目录下所有文件 */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * 从页面里抽出私有载荷。
 * Next.js 的 RSC 载荷（flight）会把长字符串抽成独立分块，页面里出现的是
 * `"ct":"$17"` 这样的引用，真正的密文在 `17:T<十六进制长度>,<内容>` 行里，
 * 所以这里先把所有 self.__next_f.push 的片段拼回完整 flight 文本，再解引用。
 */
function extractPayloads(html) {
  const rows = [];
  const pushRe = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let push;
  while ((push = pushRe.exec(html)) !== null) {
    try {
      rows.push(JSON.parse(push[1]));
    } catch {
      /* 非 JSON 片段：忽略 */
    }
  }
  const flight = rows.join("");

  /** 按键取 flight 分块（T 前缀 = 带长度前缀的文本块） */
  const chunk = (id) => {
    const re = new RegExp(`(?:^|\\n)${id}:T([0-9a-f]+),`);
    const hit = re.exec(flight);
    if (!hit) return null;
    const len = parseInt(hit[1], 16);
    return flight.slice(hit.index + hit[0].length, hit.index + hit[0].length + len);
  };

  const payloadRe =
    /"kdf":"PBKDF2-SHA256","iter":(\d+),"cipher":"AES-256-GCM","salt":"([^"]+)","iv":"([^"]+)","ct":"(?:\\?\$(\d+)|([^"]+))"/g;
  const found = [];
  let hit;
  while ((hit = payloadRe.exec(flight)) !== null) {
    const ct = hit[5] ?? chunk(hit[4]);
    if (!ct) continue;
    found.push({ iter: Number(hit[1]), salt: hit[2], iv: hit[3], ct });
  }
  return found;
}

/** 与浏览器 PrivateGate 完全同参数的解密（Node WebCrypto） */
async function decrypt(payload, password) {
  const { subtle } = webcrypto;
  const baseKey = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: Buffer.from(payload.salt, "base64"),
      iterations: payload.iter,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plain = await subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(payload.iv, "base64") },
    key,
    Buffer.from(payload.ct, "base64")
  );
  return new TextDecoder().decode(plain);
}

/**
 * 从正文里挑"应该原样出现在解密结果里"的长文本片段。
 * 用白名单字符（汉字 / 字母 / 数字 / 常见标点）扫，避开 Markdown 语法字符与需要 HTML 转义的字符，
 * 这样命中的片段在正文与 HTML 里必然字面一致。表格、列表、代码块里的文本同样会被渲染，所以一并算数。
 * 另外要排掉两类"假片段"：
 *   - 文件路径 / 链接（正文里的 `/files/x.pdf` 会被渲染逻辑改写成 `/api/download/…`，断言必然落空）；
 *   - 本来就公开的文本（项目名、外链等，别处也出现），见 publicCorpus()。
 */
const RUN_RE =
  /[\u4e00-\u9fff\u3400-\u4dbfA-Za-z0-9，。、；：？！（）《》〈〉「」『』【】…—·%．.+\-_,:;/]{24,}/gu;

/** 像文件路径 / 网址的片段：跳过（会被渲染逻辑改写，或被当成公开元数据） */
function looksLikePath(run) {
  return (
    run.includes("/files/") ||
    run.includes("/api/") ||
    run.includes("http") ||
    /\.(pdf|png|jpe?g|webp|gif|md|txt|json)\b/i.test(run)
  );
}

function sampleRuns(body) {
  const runs = (body.match(RUN_RE) ?? [])
    .map((r) => r.trim())
    .filter((r) => /[\u4e00-\u9fff]/.test(r)) // 至少含一个汉字，避开纯 URL / 数字串
    .filter((r) => !looksLikePath(r));
  const byLength = [...new Set(runs)].sort((a, b) => b.length - a.length);
  const picked = [];
  for (const run of byLength) {
    if (picked.some((p) => p.includes(run))) continue; // 已被更长的片段覆盖
    picked.push(run);
    if (picked.length >= 6) break;
  }
  // 再钉一个"文档末尾"的片段：密文被截断 / 解出半篇时能立刻发现
  const tail = runs[runs.length - 1];
  if (tail && !picked.some((p) => p.includes(tail))) picked.push(tail);
  return picked;
}

/**
 * 公开语料：其它文章的全文 + 项目 / 友链数据。
 * 只对"私有正文独有"的片段做断言——像项目名、PDF 路径这种本来就公开的文本，
 * 出现在别处是正常的，不该判成"明文泄漏"。
 */
function publicCorpus(excludeFile) {
  const parts = [];
  for (const file of readdirSync(POSTS_DIR)) {
    if (!file.endsWith(".md") || file === excludeFile) continue;
    parts.push(readFileSync(path.join(POSTS_DIR, file), "utf8"));
  }
  for (const file of ["projects.json", "links.json"]) {
    const full = path.join(ROOT, "content", file);
    if (existsSync(full)) parts.push(readFileSync(full, "utf8"));
  }
  return parts.join("\n");
}

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

async function main() {
  console.log("== 私有文章加密校验 ==");
  if (!existsSync(DIST)) {
    console.error(`构建产物不存在：${DIST}（先跑 npm.cmd run build）`);
    process.exit(1);
  }

  const { password, from } = loadPassword();
  if (!password) {
    console.error("没有找到 PRIVATE_POST_PASSWORD（.env.local / .env.production），无法校验。");
    process.exit(1);
  }
  console.log(`口令来源：${from}（长度 ${password.length}）`);
  console.log(`构建产物：${path.relative(ROOT, DIST)}\n`);

  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const privatePosts = files
    .map((file) => ({
      file,
      ...readFrontmatter(readFileSync(path.join(POSTS_DIR, file), "utf8")),
    }))
    .filter((p) => p.isPrivate);

  if (privatePosts.length === 0) {
    console.log("没有 private: true 的文章，跳过（加密链路未被使用）。");
    return;
  }

  const distFiles = walk(DIST);
  // 泄漏扫描要读的产物文件（跳过体积大的二进制 / 缓存）
  const textFiles = distFiles.filter((f) => {
    if (/\.(woff2?|png|jpe?g|webp|gif|ico|pdf|map|node)$/i.test(f)) return false;
    try {
      return statSync(f).size < 8 * 1024 * 1024;
    } catch {
      return false;
    }
  });

  for (const post of privatePosts) {
    console.log(`【${post.title || post.file}】slug=${post.slug}`);
    if (!post.slug) {
      fail("frontmatter 里没有 slug，无法定位构建产物");
      continue;
    }

    // 1) 找到该文章的构建产物页面
    const pages = distFiles.filter(
      (f) => path.basename(f) === `${post.slug}.html`
    );
    if (pages.length === 0) {
      fail(`构建产物里找不到 ${post.slug}.html（是不是走 SKIP_ENCRYPT 构建了？）`);
      continue;
    }
    console.log(`  页面：${pages.map((p) => path.relative(DIST, p)).join(", ")}`);

    // 2) 抽载荷并解密
    const payloads = pages.flatMap((p) =>
      extractPayloads(readFileSync(p, "utf8"))
    );
    if (payloads.length === 0) {
      fail("页面里没有加密载荷（密文没下发，或载荷结构变了）");
      continue;
    }
    const unique = new Map(payloads.map((p) => [p.ct, p]));
    console.log(
      `  载荷：${unique.size} 份（迭代 ${[...unique.values()][0].iter}，密文 ${[...unique.values()][0].ct.length} 字符）`
    );
    if ([...unique.values()][0].iter !== 250000) {
      fail(`迭代次数不是 250000（实际 ${[...unique.values()][0].iter}）`);
    }

    const html = await decrypt([...unique.values()][0], password);
    if (!/<div class="post-body">/.test(html)) {
      fail("解密结果不是预期的 post-body 结构");
    } else {
      ok(`解密成功（${html.length} 字符 HTML）`);
    }

    // 3) 解密结果 = 源 Markdown 正文（只断言"私有正文独有"的片段）
    const corpus = publicCorpus(post.file);
    const samples = sampleRuns(post.body).filter((run) => !corpus.includes(run));
    const missing = samples.filter((line) => !html.includes(line));
    if (samples.length === 0) {
      console.log("  · 正文文本与公开内容高度重合，没有独占片段可断言（跳过内容比对）");
    } else if (missing.length > 0) {
      fail(`解密后的 HTML 缺少正文片段：${missing[0].slice(0, 40)}…`);
    } else {
      ok(`正文比对通过（${samples.length} 段独占长文本原样出现）`);
    }

    // 私有文章带 PDF 是"半开门"：正文加密了，但 /files/ 下的 PDF 由 Nginx 直接托管
    if (post.pdf) {
      console.log(
        `  ⚠ 这篇带 pdf 附件（${post.pdf}）：正文已加密，但 PDF 文件本身仍是公开直链，别指望它保密`
      );
    }

    // 4) 明文泄漏扫描
    const leaks = [];
    for (const file of textFiles) {
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      for (const line of samples) {
        if (text.includes(line)) leaks.push(`${path.relative(DIST, file)} → ${line.slice(0, 24)}…`);
      }
    }
    // 密文里当然没有明文；这里只关心"密文之外还留了明文副本"
    if (leaks.length > 0) {
      fail(`产物里发现明文副本：\n      ${leaks.join("\n      ")}`);
    } else {
      ok(`无明文泄漏（扫描 ${textFiles.length} 个产物文件）`);
    }
  }

  console.log("\n== 结论 ==");
  if (failures.length > 0) {
    console.log(`失败 ${failures.length} 项`);
    process.exit(1);
  }
  console.log("全部通过");
}

await main();
