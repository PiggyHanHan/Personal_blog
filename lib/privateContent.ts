// ============================================================
// 私有文章加密 · 构建期（服务端专用）
//
// 何时跑：`next build` 预渲染文章详情页时，由 lib/posts.ts 调用（见 loadAllPosts）。
// 做了什么：把 Markdown 解析出的 Block[] 渲染成 HTML 字符串（lib/postHtml.ts，与详情页
//           正文 PostBody 同构），再用口令派生密钥做 AES-256-GCM 加密。
// 口令来源：环境变量 PRIVATE_POST_PASSWORD（.env.local / .env.production），
//           **只存在于构建机**，不写进源码、不进产物、不进 Git（.env* 已忽略）。
// 本地预览：环境变量 SKIP_ENCRYPT=true 时跳过加密（local-run.ps1 已默认设置），
//           私有文章以明文构建，正文全文可见、无需口令。
// ============================================================
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { blocksToHtml } from "./postHtml";
import type { Block } from "./posts";
import {
  PRIVATE_ITERATIONS as DEFAULT_ITERATIONS,
  PRIVATE_IV_BYTES,
  PRIVATE_SALT_BYTES,
  bytesToBase64,
  normalizePassword,
  type PrivatePayload,
} from "./privateCrypto";

export { blocksToHtml };

/** HTML 字符串 → AES-256-GCM 载荷 */
export function encryptHtml(html: string, password: string): PrivatePayload {
  const salt = randomBytes(PRIVATE_SALT_BYTES);
  const iv = randomBytes(PRIVATE_IV_BYTES);
  const key = pbkdf2Sync(
    normalizePassword(password),
    salt,
    DEFAULT_ITERATIONS,
    32, // AES-256 → 32 字节密钥
    "sha256"
  );
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([
    cipher.update(html, "utf8"),
    cipher.final(),
    cipher.getAuthTag(), // WebCrypto 期望的密文 = 密文 ‖ 认证标签
  ]);

  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iter: DEFAULT_ITERATIONS,
    cipher: "AES-256-GCM",
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(ct),
  };
}

/** Block[] → 加密载荷（构建期一次性完成渲染 + 加密） */
export function encryptBlocks(blocks: Block[], password: string): PrivatePayload {
  return encryptHtml(blocksToHtml(blocks), password);
}

/** 本地预览开关：local-run.ps1 设 SKIP_ENCRYPT=true */
export function isEncryptSkipped(): boolean {
  const flag = process.env.SKIP_ENCRYPT;
  return flag === "true" || flag === "1" || flag === "yes";
}

/** 构建期口令（未配置时返回空串，由调用方决定报错还是降级） */
export function privatePassword(): string {
  return (process.env.PRIVATE_POST_PASSWORD ?? "").trim();
}
