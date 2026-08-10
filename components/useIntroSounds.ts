"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVolume } from "@/components/SoundProvider";

// ============================================================
// 开屏音效 + 第一屏胡桃录音 hook
//
// 音效点位(命名见 使用中/音效/README.txt,支持 .wav/.mp3 兼容):
//   doorOpen    点击开门 → door-open.wav / door-open.mp3
//   burst       胡桃切换第二张"起!" → 起！.wav
//   energyFull  神之眼亮起(与 burst 同步)→ energy-full.wav(待录)
//   greeting    首次点胡桃的欢迎语 → 录音/你很有眼光嘛！.wav
//
// 录音:public/hutao/使用中/录音/ 下任意命名的 wav/mp3,
//   由 /api/voices 动态枚举,点胡桃随机播;首次点胡桃播欢迎语(greeting)。
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
  greeting: ["/hutao/使用中/录音/你很有眼光嘛！.wav"],
};

export function useIntroSounds() {
  const { volume } = useVolume();
  const volumeRef = useRef(1);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const poolRef = useRef<Partial<Record<IntroSoundName, HTMLAudioElement>>>({});
  const brokenRef = useRef<Partial<Record<IntroSoundName, boolean>>>({});
  const voicesRef = useRef<HTMLAudioElement[]>([]);
  const lastVoiceIdxRef = useRef(-1);
  const currentVoiceRef = useRef<HTMLAudioElement | null>(null);

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

    // 录音:从 /api/voices 动态枚举,任意命名 wav/mp3 都纳入
    let alive = true;
    fetch("/api/voices")
      .then((r) => r.json())
      .then(({ voices }: { voices: string[] }) => {
        if (!alive || !Array.isArray(voices)) return;
        voicesRef.current = voices.map(
          (name) =>
            new Audio(`/hutao/使用中/录音/${name}`)
        );
      })
      .catch(() => {
        // 枚举失败:录音池为空,点胡桃无声音
      });

    return () => {
      alive = false;
      poolRef.current = {};
      brokenRef.current = {};
      voicesRef.current = [];
      currentVoiceRef.current = null;
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

  // 点胡桃:随机播一个录音(打断当前)
  const playRandomVoice = useCallback(() => {
    const voices = voicesRef.current;
    if (voices.length === 0) return;
    // 直接打断当前录音(点胡桃=切歌,不走渐弱)
    if (currentVoiceRef.current) {
      currentVoiceRef.current.pause();
      currentVoiceRef.current.currentTime = 0;
      currentVoiceRef.current = null;
    }
    // 随机但不连续重复同一个
    let idx = Math.floor(Math.random() * voices.length);
    if (voices.length > 1 && idx === lastVoiceIdxRef.current) {
      idx = (idx + 1) % voices.length;
    }
    lastVoiceIdxRef.current = idx;
    const v = voices[idx];
    currentVoiceRef.current = v;
    try {
      v.volume = volumeRef.current; // 应用全局音量
      v.currentTime = 0;
      const p = v.play();
      if (p) p.catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  // 录音在 ms 毫秒内渐弱结束(从当前音量渐弱到 0,点击开门时用 1000)
  const fadeOutVoice = useCallback((ms: number) => {
    const v = currentVoiceRef.current;
    if (!v) return;
    const v0 = volumeRef.current;
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / ms);
      v.volume = v0 * (1 - t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        v.pause();
        v.currentTime = 0;
        v.volume = 1;
        currentVoiceRef.current = null;
      }
    };
    step();
  }, []);

  return { play, playTogether, playRandomVoice, fadeOutVoice };
}
