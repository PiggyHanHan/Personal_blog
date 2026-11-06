胡桃语音池 —— 往这个目录里丢音频文件，就自动进"点 Q 版胡桃"的随机池。

━━━ 命名约定 ━━━

  目录里所有 .mp3 / .wav / .m4a / .ogg 都会自动纳入池子，不用改名、不用改代码。
  文件名以 "_" 开头的**不进随机池**：
    _greeting-你很有眼光嘛！.mp3   ← 点击开门时的欢迎语，由代码定点播放
                                      （components/hooks/useIntroSounds.ts 的 SOUND_CANDIDATES.greeting）

━━━ 行为说明 ━━━

- 开屏第一屏点击 Q 版胡桃 → 从本池随机挑一条播放
- 播放途中再点 → 打断当前，重新随机（不会连续重复同一句）
- 播放途中点击开门 → 录音在 1 秒内渐弱结束
- 与"点侧边栏神之眼"（池子在 theme/voice/vision/）共用同一个播放器，互相打断、不叠音
- 设置面板里「胡桃语音」关掉后，两个入口都不出声

━━━ 为什么放在 public/theme/ 而不是 public/hutao/使用中/录音/ ━━━

  public/theme/ 在部署包白名单里（usertools/deploy-light.ps1），
  加进来的文件跑一次 deploy-code.ps1 就会同步到服务器；
  public/hutao/ 既不在白名单也不进 git，往里加新文件线上不会生效。
  本目录的音频是从 public/hutao/ 那批 wav 压成 mp3（单声道 80kbps）得到的，体积约 1/9。
