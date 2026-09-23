// ============================================================
// 文章图片压缩管线：content/md_images（原图）→ public/md_images（压缩后同名文件）。
//
// 使用约定（写文章时）：
//   原图放到 content/md_images/，md 里写相对路径 ../md_images/xxx.png：
//     - 本地 / GitHub 预览 → content/md_images/xxx.png（看原图）
//     - 网站详情页（/posts/xxx 等二级路径）→ /md_images/xxx.png → public/md_images/xxx.png（看压缩图）
//   压缩由本脚本在 npm run build 前自动执行（package.json 的 prebuild）。
//
// 压缩策略：
//   - 等比缩放，最长边上限 MAX_EDGE，不放大（withoutEnlargement）
//   - png：palette 量化（pngquant）+ 最高压缩等级（适合截图）
//   - jpg/jpeg：mozjpeg 质量 QUALITY
//   - webp：质量 QUALITY
//   - gif：动图原样拷贝（避免破坏动画）
//   - 已压缩且比原图新 → 跳过；public 里残留的旧文件 → 删除
// ============================================================
import {
  readdirSync,
  mkdirSync,
  statSync,
  existsSync,
  writeFileSync,
  copyFileSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = path.join(process.cwd(), "content", "md_images");
const OUT = path.join(process.cwd(), "public", "md_images");
const MAX_EDGE = 1600; // 最长边上限（等比缩小，不放大）
const QUALITY = 82; // jpeg / webp 质量
const PNG_QUALITY = 85; // png palette 质量
const IMG_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

let srcNames;
try {
  srcNames = readdirSync(SRC);
} catch {
  console.log(`[md-images] 没有 ${SRC}，跳过压缩`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

// 1) 删除 public 里已不存在原图的残留文件（只处理图片扩展名）
const outNames = new Set(readdirSync(OUT));
for (const name of outNames) {
  if (
    !srcNames.includes(name) &&
    IMG_EXTS.has(path.extname(name).toLowerCase())
  ) {
    unlinkSync(path.join(OUT, name));
    console.log(`[md-images] 删除残留 ${name}`);
  }
}

// 2) 压缩新增 / 变动的原图
let done = 0;
let skipped = 0;
let totalBefore = 0;
let totalAfter = 0;
for (const name of srcNames) {
  const ext = path.extname(name).toLowerCase();
  if (!IMG_EXTS.has(ext)) continue;
  const src = path.join(SRC, name);
  if (!statSync(src).isFile()) continue;
  const out = path.join(OUT, name);
  const srcTime = statSync(src).mtimeMs;

  // 已压缩且不旧于原图 → 跳过（避免每次构建重复压缩）
  if (existsSync(out) && statSync(out).mtimeMs >= srcTime) {
    skipped++;
    continue;
  }

  const before = statSync(src).size;
  const resize = {
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  };
  try {
    if (ext === ".gif") {
      // 动图原样拷贝，避免 sharp 丢帧
      copyFileSync(src, out);
    } else if (ext === ".png") {
      const buf = await sharp(src)
        .resize(resize)
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true,
          quality: PNG_QUALITY,
        })
        .toBuffer();
      writeFileSync(out, buf);
    } else if (ext === ".jpg" || ext === ".jpeg") {
      const buf = await sharp(src)
        .resize(resize)
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
      writeFileSync(out, buf);
    } else if (ext === ".webp") {
      const buf = await sharp(src)
        .resize(resize)
        .webp({ quality: QUALITY })
        .toBuffer();
      writeFileSync(out, buf);
    } else {
      continue;
    }
    const after = statSync(out).size;
    totalBefore += before;
    totalAfter += after;
    done++;
    console.log(
      `[md-images] ${name}: ${before} → ${after} bytes` +
        (before > 0 ? ` (-${Math.round((1 - after / before) * 100)}%)` : "")
    );
  } catch (err) {
    console.error(`[md-images] 压缩失败 ${name}: ${err.message}`);
  }
}

console.log(
  `[md-images] 完成：压缩 ${done} 个，跳过 ${skipped} 个，` +
    `${totalBefore} → ${totalAfter} bytes` +
    (totalBefore > 0 ? ` (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)` : "")
);
