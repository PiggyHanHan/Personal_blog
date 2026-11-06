"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVolume } from "@/components/providers/SoundProvider";
import { fadeVoice, playVoice, preloadVoices } from "@/lib/voicePlayer";

// ============================================================
// 开屏音效 + 第一屏胡桃录音 hook
//
// 音效点位(命名见 使用中/音效/README.txt,支持 .wav/.mp3 兼容):
//   doorOpen    点击开门 → door-open.wav / door-open.mp3
//   burst       胡桃切换第二张"起!" → 起！.wav
//   energyFull  神之眼亮起(与 burst 同步)→ energy-full.wav(待录)
//   greeting    点击开门的欢迎语 → theme/voice/hutao/_greeting-你很有眼光嘛！.mp3
//
// 录音(点胡桃随机播)已经**搬到 lib/voicePlayer.ts 的单例**里了：
//   池子 1 = public/theme/voice/hutao/（点开屏那张 Q 版胡桃）
//   池子 2 = public/theme/voice/vision/（点侧边栏那枚神之眼，见 SiteSidebar）
//   两个入口共用同一个播放器 → 互相打断、不叠音，/api/voices 也只拉一次。
//   放在 public/theme/ 而不是 public/hutao/：前者在部署包白名单里，加文件重新部署就生效。
//
// 缺文件/加载失败/浏览器拦截自动播放时一律静默跳过,不影响动画流程。
// ============================================================

export type IntroSoundName = "doorOpen" | "burst" | "energyFull" | "greeting";

const SOUND_CANDIDATES: Record<IntroSoundName, string[]> = {
  doorOpen: [
    "/hutao/使用中/音效/door-open.wav",
    "/hutao/使用中/音效/door-open.mp3",
  ],
  burst: ["/hutao/使用中/音效/起！.wav"],
  energyFull: [
    "/hutao/使用中/音效/energy-full.wav",
    "/hutao/使用中/音效/energy-full.mp3",
  ],
  // 优先用部署目录里的那份；旧路径留作兜底（老机器上还在 public/hutao/）
  greeting: [
    "/theme/voice/hutao/_greeting-你很有眼光嘛！.mp3",
    "/hutao/使用中/录音/你很有眼光嘛！.wav",
  ],
};

export function useIntroSounds() {
  const { volume } = useVolume();
  const volumeRef = useRef(1);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const poolRef = useRef<Partial<Record<IntroSoundName, HTMLAudioElement>>>({});
  const brokenRef = useRef<Partial<Record<IntroSoundName, boolean>>>({});

  // 挂载即预加载全部音效:按候选顺序试,第一个加载成功的启用,全失败标记 broken
  useEffect(() => {
    (Object.keys(SOUND_CANDIDATES) as IntroSoundName[]).forEach((name) => {
      const candidates = SOUND_CANDIDATES[name];
      const tryLoad = (idx: number) => {
        if (idx >= candidates.length) {
          brokenRef.current[name] = true;
          return;
        }
        const audio = new Audio(candidates[idx]);
        audio.preload = "auto";
        audio.addEventListener(
          "loadeddata",
          () => {
            poolRef.current[name] = audio;
          },
          { once: true }
        );
        audio.addEventListener(
          "error",
          () => tryLoad(idx + 1),
          { once: true }
        );
        audio.load(); // 主动触发加载,成功/失败事件必到其一
      };
      tryLoad(0);
    });

    // 点胡桃的录音池：交给共享播放器预加载（与神之眼那个池子互不干扰）
    void preloadVoices("hutao");

    return () => {
      poolRef.current = {};
      brokenRef.current = {};
    };
  }, []);

  const play = useCallback((name: IntroSoundName) => {
    const audio = poolRef.current[name];
    if (!audio || brokenRef.current[name]) return;
    try {
      audio.volume = volumeRef.current; // 应用全局音量
      audio.currentTime = 0;
      const p = audio.play();
      if (p) p.catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  // 同步播放两层音效(胡桃"起!" + 能量充满)
  const playTogether = useCallback(
    (names: IntroSoundName[]) => {
      names.forEach((n) => play(n));
    },
    [play]
  );

  // 播一个音效并等它放完（给动画当节拍器用：门扉的"起！"放完才卷门帘）。
  // 素材缺失 / 浏览器拦截自动播放 / 时长未知时，用 fallbackMs 兜底，绝不卡住流程。
  const playAndWait = useCallback(
    (name: IntroSoundName, fallbackMs = 1400) => {
      const audio = poolRef.current[name];
      if (!audio || brokenRef.current[name]) {
        return new Promise<void>((resolve) => {
          window.setTimeout(resolve, fallbackMs);
        });
      }
      return new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          audio.removeEventListener("ended", finish);
          window.clearTimeout(timer);
          resolve();
        };
        const durationMs =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration * 1000
            : fallbackMs;
        // 上限：时长 + 一点余量，避免 ended 事件没来时无限等
        const timer = window.setTimeout(finish, durationMs + 400);
        audio.addEventListener("ended", finish, { once: true });
        try {
          audio.volume = volumeRef.current; // 应用全局音量
          audio.currentTime = 0;
          const p = audio.play();
          if (p) p.catch(() => window.setTimeout(finish, fallbackMs));
        } catch {
          window.setTimeout(finish, fallbackMs);
        }
      });
    },
    []
  );

  // 点胡桃:随机播一条录音（打断当前）——池子与"点神之眼"共用同一个播放器，见 lib/voicePlayer.ts
  const playRandomVoice = useCallback(() => {
    playVoice("hutao");
  }, []);

  // 录音在 ms 毫秒内渐弱结束(从当前音量渐弱到 0,点击开门时用 1000)
  const fadeOutVoice = useCallback((ms: number) => {
    fadeVoice(ms);
  }, []);

  return { play, playTogether, playAndWait, playRandomVoice, fadeOutVoice };
}
