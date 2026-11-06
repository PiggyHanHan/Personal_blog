// ============================================================
// 单篇阅读数（计划 3.20）· 端到端校验
//
// 用法：
//   1) 先起一个**本地产物**服务：npm.cmd run build && npm.cmd run start -- -p 3100
//   2) node scripts/verify-view-counts.mjs [--port=3100] [--keep-data]
//
// 它做什么：headless Chrome + CDP 真浏览器验收，共 30 项断言——
//   · 公开文章：标题下 + 文末各一枚「翻阅 N 次」，数字 = 库里 PV（GET /api/stats 的 posts）
//   · 零浏览量的篇目：**整块不渲染**（不显示 0）；被翻开 1 次后才出现
//   · 私有文章：锁着 / 错口令 / 解锁后都**一个阅读数节点都没有**
//   · 每页只有 1 次 /api/stats + 1 次 /api/like（不为一个数字多开请求）
//   · 跨过 10 秒去重窗口刷新会真的再记一次，窗口内再刷不重复计数
//   · /posts 列表页与静态产物里都没有真数字（保持 ○、无 hydration 隐患）
//
// 跑完会把自己造的测试浏览记录从 data/blog.db 里删掉（--keep-data 可保留）。
//
// ⚠️ 写这个脚本时踩过、并已修掉的三个坑（改脚本前先看一眼，别再踩）：
//   1. 浏览器自己那次 POST /api/stats **先把 PV +1 再返回**，所以"打开这篇文章"看到的数字
//      = 浏览前库值 + 1；断言顺序必须是「浏览 → 读接口 → 比页面」，不能拿浏览前的值比。
//   2. 锁着的门扉根节点是 `.post-gate__overlay`（`.post-gate` 只在**解锁后**才有）。
//   3. 往 React 受控 input 里塞口令必须走**原生 value setter**（直接 input.value = x
//      不会更新 React 状态 → 叩门按钮 disabled → 点了没反应）。
// ============================================================
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const PORT = arg("port", "3100");
const ORIGIN = `http://127.0.0.1:${PORT}`;
const KEEP_DATA = args.includes("--keep-data");
const DB_PATH = "data/blog.db";

const PASSWORD = (() => {
  for (const file of [".env.local", ".env.production", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^\s*PRIVATE_POST_PASSWORD\s*=\s*(.*)$/.exec(line);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
})();
const INDEX = JSON.parse(readFileSync("data/post-index.json", "utf8")).posts;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => n.toLocaleString("zh-CN");
/** 去掉 CSS gap 造成的空白差异：textContent 是"翻阅4次"，视觉上是"翻阅 4 次" */
const tight = (s) => s.replace(/\s+/g, "");

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP 超时：${method}`));
        }
      }, 30000);
    });
  }
  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `页面表达式报错：${res.exceptionDetails.exception?.description ?? JSON.stringify(res.exceptionDetails)}`
      );
    }
    return res.result.value;
  }
}

async function waitForHttp(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* 还没起来 */
    }
    await sleep(500);
  }
  throw new Error(`等不到 ${url}（先跑 npm.cmd run start -- -p ${PORT}）`);
}

/** 只读接口看某篇的 PV（GET 不记账；每次换 IP，避免撞上同一访客的去重窗口） */
let readSeq = 0;
const readIps = [];
async function serverPv(slug) {
  readSeq += 1;
  const ip = `203.0.113.${100 + readSeq}`;
  readIps.push(ip);
  const res = await fetch(`${ORIGIN}/api/stats`, {
    headers: { "x-real-ip": ip, "user-agent": `verify-view-counts-read-${readSeq}` },
  });
  const data = await res.json();
  return Object.prototype.hasOwnProperty.call(data.posts ?? {}, slug) ? data.posts[slug] : null;
}

const seedIps = [];
async function seedVisit(slug, i) {
  const ip = `198.51.100.${i}`;
  seedIps.push(ip);
  const res = await fetch(`${ORIGIN}/api/stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": ip, "user-agent": `verify-view-counts-seed-${i}` },
    body: JSON.stringify({ path: `/posts/${slug}` }),
  });
  return res.ok;
}

/** 清理本次脚本造的数据（只删这些测试 IP 的哈希行；哈希依赖库里的盐，用 visitor 列反查） */
function cleanupDb() {
  if (KEEP_DATA) {
    console.log("\n--keep-data：保留本次测试数据");
    return;
  }
  if (!existsSync(DB_PATH)) return;
  let DatabaseSync;
  try {
    ({ DatabaseSync } = process.getBuiltinModule("node:sqlite"));
  } catch {
    console.log("\n（当前 Node 没有 node:sqlite，跳过测试数据清理）");
    return;
  }
  try {
    const db = new DatabaseSync(DB_PATH);
    const rows = db.prepare("SELECT DISTINCT visitor FROM visits WHERE ua LIKE 'verify-view-counts-%'").all();
    let removed = 0;
    const del = db.prepare("DELETE FROM visits WHERE visitor = ?");
    for (const row of rows) removed += del.run(row.visitor).changes ?? 0;
    db.close();
    console.log(`\n已清理测试浏览记录 ${removed} 行（${rows.length} 个测试访客哈希）`);
  } catch (err) {
    console.log("\n清理测试数据失败（不影响结论）：", err.message);
  }
}

const results = [];
const push = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "[PASS]" : "[FAIL]"} ${name}${detail ? ` -- ${detail}` : ""}`);
};

async function main() {
  console.log("== 单篇阅读数（3.20）端到端校验 ==");
  await waitForHttp(`${ORIGIN}/posts`);
  console.log(`站点就绪：${ORIGIN}\n`);

  const pub = INDEX.filter((p) => !p.private);
  const priv = INDEX.filter((p) => p.private);
  const privateSlug = priv.length > 0 ? priv[0].slug : null;

  // ---- 动态挑一篇"当前零浏览量"的公开文章（库里有历史数据时硬编码必然踩空）----
  let never = null;
  for (const p of pub.slice(0, 12)) {
    if ((await serverPv(p.slug)) === null) {
      never = p.slug;
      break;
    }
  }
  const visited = pub.find((p) => p.slug !== never).slug;
  console.log(`有浏览量：${visited}`);
  console.log(`零浏览量：${never ?? "(库里每篇都有 PV，跳过该项)"}`);
  console.log(`私有：${privateSlug ?? "(示例内容里没有私有文章，该组跳过)"}\n`);

  for (let i = 1; i <= 3; i += 1) await seedVisit(visited, i);
  console.log(`已为 ${visited} 造 3 次翻阅（3 个不同 IP）\n`);

  const chromePath = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((p) => existsSync(p));
  if (!chromePath) throw new Error("找不到 Chrome / Edge 可执行文件");

  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      `--user-data-dir=${process.cwd()}\\.tmp-chrome-view-counts`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let target = null;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && !target) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json/list");
      const list = await res.json();
      target = list.find((t) => t.type === "page");
    } catch {
      /* 等 */
    }
    if (!target) await sleep(400);
  }
  if (!target) throw new Error("Chrome CDP 没起来");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  const cdp = new Cdp(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Log.enable");

  async function goto(path, selector) {
    cdp.events.length = 0;
    await cdp.send("Page.navigate", { url: `${ORIGIN}${path}` });
    const t0 = Date.now();
    let loaded = false;
    while (Date.now() - t0 < 30000) {
      if (cdp.events.some((e) => e.method === "Page.loadEventFired")) {
        loaded = true;
        break;
      }
      await sleep(100);
    }
    let found = false;
    const t1 = Date.now();
    while (Date.now() - t1 < 25000) {
      const state = await cdp.eval(
        `({ has: Boolean(document.querySelector(${JSON.stringify(selector)})) })`
      );
      if (state.has) {
        found = true;
        break;
      }
      await sleep(250);
    }
    await sleep(2200); // 等一次 stats + 一次 like 回来并渲染
    return { loaded, found };
  }

  const netCounts = () => {
    const urls = cdp.events
      .filter((e) => e.method === "Network.requestWillBeSent")
      .map((e) => e.params.request.url);
    return {
      stats: urls.filter((u) => u.includes("/api/stats")).length,
      like: urls.filter((u) => u.includes("/api/like")).length,
      all: [...new Set(urls.filter((u) => u.includes("/api/")))],
    };
  };
  const consoleProblems = () =>
    cdp.events
      .filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")
      .map((e) => `${e.params.entry.text} ${e.params.entry.url ?? ""}`)
      .filter((t) => !/door-open\.wav|favicon\.ico/.test(t)); // §12 已知噪音

  try {
    // ============ 1) 有浏览量的公开文章 ============
    console.log("=== 1) 有浏览量的公开文章 ===");
    const nav1 = await goto(`/posts/${visited}?skipIntro=1`, ".post-head h1");
    push("公开文章页正常加载（不是空白页）", nav1.loaded && nav1.found);

    const view = await cdp.eval(`(() => {
      const nodes = [...document.querySelectorAll('.view-count')];
      return {
        count: nodes.length,
        texts: nodes.map((n) => n.textContent.trim()),
        inMeta: nodes.filter((n) => n.closest('.post-meta')).length,
        inReactions: nodes.filter((n) => n.closest('.reactions__head')).length,
        metaChildren: [...(document.querySelector('.post-meta')?.children ?? [])].map((c) => c.className),
        tooltip: nodes[0]?.getAttribute('title') ?? '',
        boxes: nodes.map((n) => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }),
        fontSize: nodes[0] ? getComputedStyle(nodes[0]).fontSize : '',
        strongColor: nodes[0] ? getComputedStyle(nodes[0].querySelector('strong')).color : '',
        visuallyHiddenInBadge: document.querySelectorAll('.view-count .visually-hidden').length,
      };
    })()`);
    console.log(JSON.stringify(view, null, 2));

    // 关键顺序：页面已经包含"本次浏览"，现在再读接口 → 与页面同值
    const pvShown = await serverPv(visited);
    console.log(`页面显示的值应等于此刻接口里的 PV = ${pvShown}`);

    push("标题下 + 文末各一枚阅读数", view.count === 2 && view.inMeta === 1 && view.inReactions === 1, `共 ${view.count} 处`);
    push(
      "文案是「翻阅 N 次」（不含「人」字，也没有重复的读屏文字）",
      view.texts.every((t) => tight(t) === `翻阅${fmt(pvShown)}次`) && !/人/.test(view.texts.join("")) && view.visuallyHiddenInBadge === 0,
      JSON.stringify(view.texts)
    );
    push(
      "数字 = 库里 PV（SELECT COUNT(*) FROM visits WHERE slug = ?）",
      tight(view.texts[0]) === `翻阅${fmt(pvShown)}次`,
      `库 ${pvShown} / 页面 ${view.texts[0]}`
    );
    push("两枚徽章都有实际尺寸", view.boxes.every((b) => b.w > 0 && b.h > 0), JSON.stringify(view.boxes));
    push("悬停提示写清口径（PV + 去重 + 不存 IP）", /被翻开的次数/.test(view.tooltip) && /不存 IP/.test(view.tooltip), view.tooltip.slice(0, 36) + "...");
    push("落在日期 / 标签 / 留痕那一行里", view.metaChildren.includes("view-count"), JSON.stringify(view.metaChildren));
    push("样式生效（字号 + 数字低调金）", view.fontSize !== "" && view.strongColor !== "", `${view.fontSize} / ${view.strongColor}`);
    const n1 = netCounts();
    push("每页只有 1 次 /api/stats + 1 次 /api/like", n1.stats === 1 && n1.like === 1, `stats=${n1.stats} like=${n1.like}; ${JSON.stringify(n1.all)}`);
    push("无未知控制台错误", consoleProblems().length === 0, consoleProblems().join(" | "));

    try {
      await cdp.eval(`document.querySelector('.post-head')?.scrollIntoView({ block: 'start' })`);
      await sleep(600);
      const shot = await cdp.send("Page.captureScreenshot", { captureBeyondViewport: false });
      writeFileSync(".playwright-mcp/view-count-head.png", Buffer.from(shot.data, "base64"));
      console.log("截图：.playwright-mcp/view-count-head.png");
    } catch (err) {
      console.log("截图失败（不影响断言）：", err.message);
    }

    console.log("\n等 12 秒跨过 10 秒去重窗口，再刷新…");
    await sleep(12000);
    const nav2 = await goto(`/posts/${visited}?skipIntro=1`, ".post-head h1");
    const afterReload = await cdp.eval(`[...document.querySelectorAll('.view-count')].map((n) => n.textContent.trim())`);
    const pvAfterReload = await serverPv(visited);
    push("刷新后页面仍正常", nav2.loaded && nav2.found);
    push(
      "跨过去重窗口后刷新会真的再记一次（PV +1，页面跟着涨）",
      pvAfterReload === pvShown + 1 && afterReload.length === 2 && afterReload.every((t) => tight(t) === `翻阅${fmt(pvShown + 1)}次`),
      `刷新前库 ${pvShown} / 刷新后库 ${pvAfterReload}；页面 ${JSON.stringify(afterReload)}`
    );
    push("刷新后无 hydration / 控制台错误", consoleProblems().length === 0, consoleProblems().join(" | "));

    await cdp.send("Page.navigate", { url: `${ORIGIN}/posts/${visited}?skipIntro=1` });
    await sleep(2500);
    const third = await serverPv(visited);
    push("10 秒内再刷一次不会重复计数（库里不涨）", third === pvAfterReload, `第二次刷新后库 ${pvAfterReload} / 紧接着再刷 ${third}`);

    // ============ 2) 零浏览量的公开文章 ============
    if (never) {
      console.log("\n=== 2) 零浏览量的公开文章 ===");
      push("挑到的这篇在接口里没有 key（数据层就不给 0）", (await serverPv(never)) === null);
      const nav3 = await goto(`/posts/${never}?skipIntro=1`, ".post-head h1");
      push("零浏览量文章页正常加载", nav3.loaded && nav3.found);
      const neverView = await cdp.eval(`({
        viewCount: document.querySelectorAll('.view-count').length,
        metaText: document.querySelector('.post-meta')?.textContent ?? '',
        reactionsHead: document.querySelector('.reactions__head')?.textContent?.trim() ?? '',
      })`);
      const pvNever = await serverPv(never);
      console.log(JSON.stringify(neverView, null, 2));
      push(
        "零值时不渲染、被翻开 1 次后才出现「翻阅 1 次」",
        neverView.viewCount === 2 && pvNever === 1 && /翻阅\s*1\s*次/.test(neverView.metaText),
        `节点 ${neverView.viewCount} 个；库 ${pvNever}；meta="${neverView.metaText}"`
      );
      push("页面里没有「翻阅 0 次」这种字面 0", !/翻阅\s*0\s*次/.test(neverView.metaText + neverView.reactionsHead));
    }

    // ============ 3) 私有文章 ============
    // 示例内容里可能一篇私有文章都没有（模板默认如此）——那就跳过这一组，别让脚本报错
    if (!privateSlug) {
      console.log("\n=== 3) 私有文章：没有私有文章，跳过 ===");
    } else {
    console.log("\n=== 3) 私有文章 ===");
    const nav4 = await goto(`/posts/${privateSlug}?skipIntro=1`, ".post-gate__overlay");
    push("门扉正常渲染（.post-gate__overlay）", nav4.loaded && nav4.found);
    const locked = await cdp.eval(`({
      viewCount: document.querySelectorAll('.view-count').length,
      overlay: Boolean(document.querySelector('.post-gate__overlay')),
      unlockedBar: Boolean(document.querySelector('.post-gate')),
      bodyLen: (document.querySelector('.post-gate__body')?.textContent ?? '').length,
      hasInput: Boolean(document.querySelector('input[name="private-password"]')),
    })`);
    push(
      "锁着：门扉在、正文没渲染、没有任何阅读数节点",
      locked.overlay === true && locked.unlockedBar === false && locked.bodyLen === 0 && locked.viewCount === 0 && locked.hasInput === true,
      JSON.stringify(locked)
    );

    // 探针：把组件实际调用的 WebCrypto 解密抓出来（成功/失败都记），
    // 免得出现"门没开但不知道卡在解密还是动画"这种情况
    await cdp.eval(`(() => {
      if (window.__pwdbg) return true;
      window.__pwdbg = { calls: 0, ok: 0, fail: 0, lastError: null, plaintextHead: '' };
      const realDecrypt = crypto.subtle.decrypt.bind(crypto.subtle);
      crypto.subtle.decrypt = async (...a) => {
        window.__pwdbg.calls += 1;
        try {
          const out = await realDecrypt(...a);
          window.__pwdbg.ok += 1;
          window.__pwdbg.plaintextHead = new TextDecoder().decode(out).slice(0, 40);
          return out;
        } catch (err) {
          window.__pwdbg.fail += 1;
          window.__pwdbg.lastError = String(err && err.name);
          throw err;
        }
      };
      return true;
    })()`);

    /** 填口令 + 叩门：必须走 React 的原生 value setter（见文件头第 3 条坑） */
    const knock = (password) =>
      cdp.eval(`(() => {
        const input = document.querySelector('input[name="private-password"]');
        if (!input) return { error: 'no-input' };
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(password)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const btn = document.querySelector('.post-gate__vision');
        const wasDisabled = btn ? btn.disabled : null;
        btn?.click();
        return { wasDisabled, valueLength: input.value.length };
      })()`);

    const wrongKnock = await knock("wrong-password-view-counts");
    await sleep(3000);
    const wrong = await cdp.eval(
      `({ viewCount: document.querySelectorAll('.view-count').length, overlay: Boolean(document.querySelector('.post-gate__overlay')), bodyLen: document.querySelector('.post-gate__body')?.textContent?.length ?? 0, probe: window.__pwdbg })`
    );
    push("错误口令叩门按钮可用（口令 state 真的更新了）", wrongKnock.wasDisabled === false, JSON.stringify(wrongKnock));
    push(
      "错误口令后：仍锁着、正文仍为空、阅读数仍无（解密确实报错）",
      wrong.overlay === true && wrong.bodyLen === 0 && wrong.viewCount === 0 && wrong.probe?.fail === 1,
      JSON.stringify(wrong.probe)
    );

    const rightKnock = await knock(PASSWORD);
    let unlocked = null;
    const t2 = Date.now();
    while (Date.now() - t2 < 30000) {
      unlocked = await cdp.eval(`({
        viewCount: document.querySelectorAll('.view-count').length,
        bodyLength: document.querySelector('.post-gate__body')?.innerHTML?.length ?? 0,
        reactions: document.querySelectorAll('.reactions__btn').length,
      })`);
      if (unlocked.bodyLength > 1000) break;
      await sleep(500);
    }
    // 判定"解开了"只看正文长度（探针对象是**快照**，跨两次叩门读会拿到旧值）
    push(
      "正确口令能解开（浏览器端密文与构建机口令是配的）",
      unlocked.bodyLength > 1000,
      `正文 ${unlocked.bodyLength} 字符；叩门 ${JSON.stringify(rightKnock)}；探针累计 ${JSON.stringify(await cdp.eval("window.__pwdbg"))}`
    );
    push("解锁后的私有文章依然不显示阅读数", unlocked.viewCount === 0, JSON.stringify(unlocked));
    const privateInApi = await serverPv(privateSlug);
    push("私有文章的浏览不进公开 posts 映射", privateInApi === null, `posts["${privateSlug}"] = ${JSON.stringify(privateInApi)}`);
    const n3 = netCounts();
    push("私有文章页同样只有 1 次 stats + 1 次 like（解锁也没多打）", n3.stats === 1 && n3.like === 1, `stats=${n3.stats} like=${n3.like}`);
    push("私有文章页无未知控制台错误", consoleProblems().length === 0, consoleProblems().join(" | "));

    try {
      const shot = await cdp.send("Page.captureScreenshot", { captureBeyondViewport: false });
      writeFileSync(".playwright-mcp/view-count-private.png", Buffer.from(shot.data, "base64"));
    } catch {
      /* 截图失败不影响结论 */
    }
    }

    // ============ 4) 静态产物：数字必须在客户端 ============
    console.log("\n=== 4) 列表页与静态产物（保持 ○，数字全在客户端）===");
    const nav5 = await goto("/posts?skipIntro=1", ".quest-board, .quest-card");
    const board = await cdp.eval(`({
      cards: document.querySelectorAll('.quest-card').length,
      viewCounts: document.querySelectorAll('.view-count').length,
    })`);
    push("卡片上不显示阅读数（3.20 第 ④ 条：不改列表页）", nav5.found && board.viewCounts === 0, JSON.stringify(board));
    const listHtml = await (await fetch(`${ORIGIN}/posts`)).text();
    push(
      "列表页静态 HTML 里没有「翻阅 N 次」真数字",
      !/翻阅\s*\d/.test(listHtml) && !listHtml.includes("view-count__value"),
      `产物长度 ${listHtml.length}`
    );
    const postHtml = await (await fetch(`${ORIGIN}/posts/${visited}`)).text();
    push("文章页静态 HTML 里也没有阅读数节点（hydrate 后才出现）", !postHtml.includes("view-count"), `产物长度 ${postHtml.length}`);
  } finally {
    ws.close();
    chrome.kill("SIGKILL");
    await sleep(500);
    try {
      rmSync(".tmp-chrome-view-counts", { recursive: true, force: true });
    } catch {
      /* 删不掉就算了 */
    }
    cleanupDb();
  }

  console.log("\n== 结论 ==");
  const failed = results.filter((r) => !r.pass);
  console.log(
    failed.length === 0
      ? `全部通过（${results.length} 项）`
      : `失败 ${failed.length} / ${results.length} 项\n` + failed.map((f) => `  - ${f.name}: ${f.detail}`).join("\n")
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("脚本异常：", err);
  process.exit(2);
});
