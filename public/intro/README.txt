把开幕动画的素材放到这个目录（public/intro/）下。

按时间段命名（网站会根据你打开的时间自动选对应那一段开屏）：

  清晨 05:00–07:59   →  frame-dawn.jpg   +  video-dawn.mp4
  白天 08:00–16:59   →  frame-day.jpg    +  video-day.mp4
  黄昏 17:00–19:59   →  frame-dusk.jpg   +  video-dusk.mp4
  夜晚 20:00–04:59   →  frame-night.jpg  +  video-night.mp4

每一组都是一对：一张第一帧静态图 + 一个约 1 秒的视频。

要求：
- 图片格式：.jpg / .png / .webp 都可以（改 components/IntroOverlay.tsx 里的路径即可）
- 视频格式：.mp4 / .webm 都可以
- 四组建议都放齐；缺了哪组，那个时段进入时就会直接跳过开幕
- 视频画面最好和第一帧图一致，这样静态图和视频之间没有跳跃感

想调整时间段划分？改 components/IntroOverlay.tsx 里 getPeriod() 函数即可。
