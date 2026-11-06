// ============================================================
// 互动数据落盘层（计划文档 §0.6 **D1 决策：node:sqlite**）
//
// 决策依据（2026-10-11 实测，见 logs/2026-10-11.md）：
//   · 服务器 Node **v22.23.2** ≥ 22.5，`require("node:sqlite")` **不带任何 flag 就能用**
//     （v22.13 起去掉了 --experimental-sqlite 要求，实测直接可用，只打印一条 ExperimentalWarning）；
//   · 于是既不需要 better-sqlite3（要 node-gyp 编译、要进部署包、要 npm install 重编），
//     也不需要"纯 JSON + 自己防并发写坏"（写一半断电就丢全库）。
//   · SQLite 自带 WAL，写操作是事务性的；pm2 restart 清内存也不影响——这正是 §0.3 要的"计数必须落盘"。
//
// 位置：/var/www/blog/data/blog.db（服务器）· data/blog.db（本地）
//   ⚠️ data/ **不在** usertools/deploy-light.ps1 的白名单里，也**不在** deploy-code.ps1 的 rm 列表里，
//      这样线上数据既不会被本地空目录覆盖，也不会被代码更新删掉（§0.3）。
// ============================================================
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

/** 数据目录（含 SQLite 库与首页备份用的导出物） */
export const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "blog.db");

type SqliteModule = typeof import("node:sqlite");
type Database = import("node:sqlite").DatabaseSync;

/**
 * 取 node:sqlite 模块。
 *
 * 为什么不用 `import { DatabaseSync } from "node:sqlite"`：
 *   打包器判断"是不是 Node 内置模块"靠的是 `module.builtinModules`，而这份清单里**没有 sqlite**
 *   （sqlite 只能以 `node:sqlite` 形式加载；实测 Node 22.23.2 / 24.15.0 都是 `isBuiltin("node:sqlite")===true`
 *   但 `builtinModules.includes("sqlite")===false`）。静态 import 有被 webpack 判成"模块不存在"的风险。
 *   `process.getBuiltinModule()` 是 Node 22.3+ 的运行时接口，打包器无法静态分析，会原样留到运行时，
 *   正好绕开这个坑；类型仍然是完整的（@types/node 里有 "node:sqlite" 的映射）。
 */
function loadSqlite(): SqliteModule {
  const mod = process.getBuiltinModule("node:sqlite");
  if (!mod) {
    throw new Error(
      "[db] 当前 Node 运行时没有 node:sqlite（需要 Node ≥ 22.5）。请升级 Node 或改用其它存储方案。"
    );
  }
  return mod;
}

const SCHEMA = `
-- 运行期元数据：匿名盐等（不放 .env：换机器 / 重部署都不会让历史哈希失效）
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
) WITHOUT ROWID;

-- 每次页面浏览一行（PV）；UV 靠 visitor 去重
-- visitor = sha256(ip + ua + salt + 当天)，只留 32 位十六进制，**IP 本身绝不落库**
CREATE TABLE IF NOT EXISTS visits (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,
  day     TEXT    NOT NULL,
  path    TEXT    NOT NULL,
  slug    TEXT,
  visitor TEXT    NOT NULL,
  ua      TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS visits_visitor ON visits (visitor);
CREATE INDEX IF NOT EXISTS visits_day     ON visits (day);
CREATE INDEX IF NOT EXISTS visits_slug    ON visits (slug);

-- 点赞 / 表情反应：同一个访客对同一篇的同一个表情只算一次（主键即唯一约束）
CREATE TABLE IF NOT EXISTS reactions (
  slug    TEXT    NOT NULL,
  kind    TEXT    NOT NULL,
  visitor TEXT    NOT NULL,
  ts      INTEGER NOT NULL,
  PRIMARY KEY (slug, kind, visitor)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS reactions_slug ON reactions (slug);
`;

let db: Database | null = null;

/** 取数据库连接（进程内单例；首次调用时建目录、建表） */
export function getDb(): Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  const { DatabaseSync } = loadSqlite();
  const instance = new DatabaseSync(DB_FILE);
  // WAL：读写不互相阻塞，断电最多丢最后几条；busy_timeout 防构建期与运行时抢锁
  instance.exec("PRAGMA journal_mode = WAL;");
  instance.exec("PRAGMA synchronous = NORMAL;");
  instance.exec("PRAGMA busy_timeout = 3000;");
  instance.exec(SCHEMA);
  db = instance;
  return db;
}

/**
 * 匿名盐：首次运行随机生成并落库。
 * 有了它，哪怕库里的 visitor 列被看到，也没法拿 IP 段去暴力枚举反推（盐不在 Git、不下发浏览器）。
 */
export function getVisitorSalt(): string {
  const instance = getDb();
  const row = instance
    .prepare("SELECT v FROM meta WHERE k = ?")
    .get("visitor_salt") as { v?: string } | undefined;
  if (row && typeof row.v === "string" && row.v.length > 0) return row.v;

  const salt = randomBytes(16).toString("hex");
  instance
    .prepare("INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)")
    .run("visitor_salt", salt);
  return salt;
}
