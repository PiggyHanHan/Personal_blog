# 替换开屏视频素材 —— Agent 操作指南

> 用途：用户提供新的录屏视频，替换博客开屏动画中对应时段的素材。
> 本文件是给 AI agent 看的完整操作指引，按步骤执行即可。

## 一、素材位置与命名规则

所有开屏素材在 `public/intro/` 目录下，按时段命名，**视频和第一帧必须同名配对**：

| 时段 | 时间段 | 第一帧图 | 视频 |
|---|---|---|---|
| 清晨 dawn | 05:00–07:59 | `frame-dawn.jpg` | `video-dawn.mp4` |
| 白天 day | 08:00–16:59 | `frame-day.jpg` | `video-day.mp4` |
| 黄昏 dusk | 17:00–19:59 | `frame-dusk.jpg` | `video-dusk.mp4` |
| 夜晚 night | 20:00–04:59 | `frame-night.jpg` | `video-night.mp4` |

- 图片支持 `.jpg / .png / .webp`
- 视频支持 `.mp4 / .webm`
- 素材命名在 `components/IntroOverlay.tsx` 的 `INTROS_BY_PERIOD` 里写死，改名后需同步改代码

## 二、替换步骤

### 第 1 步：确认要替换的时段

问用户或根据对话判断要替换哪个时段（清晨/白天/黄昏/夜晚）。确认后明确：`<period>` = `dawn | day | dusk | night` 之一。

### 第 2 步：备份旧素材（重要）

```powershell
# 新建备份目录（若不存在）
New-Item -ItemType Directory -Force backup-intro | Out-Null
# 备份当前视频和第一帧（用带时间戳的名字，避免覆盖旧的备份）
Copy-Item "public\intro\video-<period>.mp4" "backup-intro\video-<period>-$(Get-Date -Format yyyyMMddHHmm).mp4"
Copy-Item "public\intro\frame-<period>.jpg" "backup-intro\frame-<period>-$(Get-Date -Format yyyyMMddHHmm).jpg"
```

### 第 3 步：替换视频

把用户提供的新视频复制进来，覆盖旧视频：

```powershell
Copy-Item "<用户给的视频完整路径>" "public\intro\video-<period>.mp4" -Force
```

### 第 4 步：提取第一帧（关键）

**前提：没有 ffmpeg，必须用浏览器（Playwright）提取。**

1. 启动开发服务器（如未运行）：
   ```powershell
   npm run dev
   ```
2. 用 Playwright 打开任意页面（如 `http://localhost:3000`），执行下面的 JS 提取第一帧：

```js
async () => {
  const v = document.createElement('video');
  v.src = '/intro/video-<period>.mp4';   // 替换 <period>
  v.muted = true;
  v.preload = 'auto';
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('load failed')); v.load(); });
  v.currentTime = 0.05;                    // 跳到 0.05s，确保画面已解码
  await new Promise((res) => { v.onseeked = res; });
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  return c.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '');
}
```

3. 用 `browser_evaluate` 的 `filename` 参数把返回的 base64 保存到文件（如 `frame-tmp.b64.txt`）。
   **注意**：保存的文件内容是被 JSON 引号包裹的字符串，解码前要处理：

```powershell
$raw = Get-Content -Raw 'frame-tmp.b64.txt'
$inner = $raw | ConvertFrom-Json   # 第一层：去掉外层引号（工具保存为转义 JSON 字符串）
$b64 = $inner | ConvertFrom-Json   # 有的场景需要两层，检查一下内容
# 如果 $inner 本身就是 base64 字符串（没有转义），直接用它
[System.IO.File]::WriteAllBytes("E:\Projects\Personal_blog\public\intro\frame-<period>.jpg", [Convert]::FromBase64String($b64))
```

> 若环境里有 ffmpeg，可简化为：`ffmpeg -y -ss 0.05 -i video-<period>.mp4 -vframes 1 frame-<period>.jpg`

### 第 5 步：验证

1. 浏览器访问 `http://localhost:3000`。
2. 当前"系统时段"决定播放哪段开屏。检查方式：
   ```js
   new Date().getHours()  // 5-7→dawn, 8-16→day, 17-19→dusk, 其他→night
   ```
3. 确认对应时段显示的是**新视频的第一帧**，点击后播放的是新视频，播完正常进入博客。
4. 若当前时间不在目标时段，可用 Playwright 修改浏览器时间或临时改 `lib/period.ts` 的 `getPeriod()` 强制返回目标时段，验证后改回。

### 第 6 步：git 存档

```powershell
git add -A
git commit -m "替换 <period> 时段开屏视频及第一帧"
```

## 三、注意事项

1. **视频和第一帧画面必须一致**：第一帧是视频开头（约 0.05s）的画面，静态图显示 → 点击 → 视频播放，画面一致才不会"跳一下"。
2. **分辨率越高越清晰**：推荐 1920×1080 或更高（开屏是 cover 全屏铺满，低于 1080p 会糊）。
3. **时长 1–3 秒合适**：太长会拖慢进入博客。
4. **缺素材的时段**：那个时段进入会直接跳过开屏（不会卡住）。
5. **不要删 `public/intro/README.txt`**，它是素材命名说明。
6. 时间段划分逻辑在 `lib/period.ts` 的 `getPeriod()`，要改时段划分改那里。

## 四、常见问题

- **提取的第一帧是黑屏**：`currentTime` 设 0.05 后再等待 `seeked` 事件；若仍黑，改用 0.1。
- **视频加载失败（404）**：确认文件名/路径和 `INTROS_BY_PERIOD` 里的完全一致（大小写、下划线）。
- **Playwright evaluate 结果带引号**：工具会把字符串保存为 JSON 格式，用 `ConvertFrom-Json` 解一层（有的环境要两层）。
- **浏览器时间不是本地时间**：Playwright/无头环境的 `getHours()` 可能与用户机器不一致，验证时段时先打印 `new Date().toString()` 确认。
