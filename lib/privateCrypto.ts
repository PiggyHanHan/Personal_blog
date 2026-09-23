// ============================================================
// 私有文章加密 · 算法参数与「Node / 浏览器通用」的小工具
//
// 分工：
//   本文件      —— 载荷结构 + 参数 + base64 互转（**不 import node:***，客户端组件也要用）
//   privateContent.tsx —— 构建期加密（node:crypto，服务端专用）
//   components/post/PrivateGate.tsx —— 浏览器端解密（WebCrypto）
//
// 设计要点：
//   - AES-256-GCM（带认证标签，密码错误 / 密文被改都会在解密时直接失败，不存在"解出乱码"）；
//   - 密钥由口令经 PBKDF2-HMAC-SHA256 现推，产物里只有盐、IV、密文，**没有口令也没有密钥**；
//   - 迭代次数写进载荷（iter），将来调大参数不会让已发布的旧文章解不开；
//   - 口令在两端统一做 NFKC 归一化：中文输入法打出的全角字符（如"ａｂｃ"）也能和半角输入对上。
// ============================================================

/** 随静态页面一起下发的加密载荷（本身不含口令、不含密钥） */
export type PrivatePayload = {
  /** 载荷格式版本（将来换算法时用于兼容判断） */
  v: 1;
  kdf: "PBKDF2-SHA256";
  /** PBKDF2 迭代次数（跟着载荷走） */
  iter: number;
  cipher: "AES-256-GCM";
  /** 盐，base64（16 字节） */
  salt: string;
  /** 初始向量，base64（12 字节，GCM 标准长度） */
  iv: string;
  /** 密文（末尾 16 字节为 GCM 认证标签），base64 */
  ct: string;
};

/** PBKDF2 迭代次数：本地构建 25 万次，约 0.1~0.3s，足够挡住离线爆破的性价比 */
export const PRIVATE_ITERATIONS = 250_000;
export const PRIVATE_SALT_BYTES = 16;
export const PRIVATE_IV_BYTES = 12;

/** 口令归一化（两端必须一致，否则同一口令推出不同密钥） */
export function normalizePassword(password: string): string {
  return password.normalize("NFKC");
}

/** Uint8Array → base64（分块处理，避免大密文触发参数个数上限） */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    let part = "";
    for (let j = 0; j < chunk.length; j += 1) {
      part += String.fromCharCode(chunk[j]);
    }
    binary += part;
  }
  return btoa(binary);
}

/** base64 → Uint8Array（显式标 ArrayBuffer：WebCrypto 的 BufferSource 不收 SharedArrayBuffer 那种后备缓冲） */
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
