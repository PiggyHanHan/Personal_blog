"use client";

// ============================================================
// 胡桃语音播放器（计划 9.1）——**模块级单例**
//
// 为什么必须是单例：同一个声音要在两个地方被触发
//   ① 开屏第一屏那张 Q 版胡桃（点一下随机说一句）  → 池子 hutao
//   ② 左侧导航栏那枚神之眼（点一下随机应一声）      → 池子 vision
// 如果各自 new Audio，两边会同时出声、互相盖住，还会把 /api/voices 拉两遍。
// 单例还有一个关键行为：**新的一次点击会打断当前正在播的那条**（点它 = 切歌）。
//
// 音量与开关不在这里存：由 SoundProvider 通过 configureVoice() 推过来
// （音量滑杆 / 「胡桃语音」总开关都是它管的）。
//
// 池子内容由 /api/voices?pool=xxx 动态枚举，往目录里丢文件就自动进池子，不用改代码。
// ============================================================

export type VoicePool = "hutao" | "vision";

type Pool = {
  /** URL 前缀，由接口返回（别在客户端硬编码目录） */
  dir: string;
  audios: HTMLAudioElement[];
};

const pools = new Map<VoicePool, Pool>();
const loading = new Map<VoicePool, Promise<Pool>>();
const lastIdx = new Map<VoicePool, number>();

/** 当前正在播的那条（切歌/渐弱都要用到） */
let current: HTMLAudioElement | null = null;

const settings = { volume: 1, enabled: true };

/** SoundProvider 调用：把全局音量与总开关同步进来 */
export function configureVoice(next: { volume?: number; enabled?: boolean }): void {
  if (typeof next.volume === "number") settings.volume = Math.min(1, Math.max(0, next.volume));
  if (typeof next.enabled === "boolean") {
    settings.enabled = next.enabled;
    // 关掉时把正在播的那条也停掉，别让"关了还在响"
    if (!settings.enabled) stopVoice();
  }
}

/** 预加载一个池子（挂载时调用，点下去就能立刻出声） */
export function preloadVoices(pool: VoicePool): Promise<Pool> {
  const cached = pools.get(pool);
  if (cached) return Promise.resolve(cached);
  const pending = loading.get(pool);
  if (pending) return pending;

  const task = fetch(`/api/voices?pool=${pool}`)
    .then((r) => r.json())
    .then((data: { dir?: string; voices?: string[] }) => {
      const dir = typeof data?.dir === "string" ? data.dir : "";
      const names = Array.isArray(data?.voices) ? data.voices : [];
      const entry: Pool = {
        dir,
        audios: names.map((name) => {
          const audio = new Audio(`${dir}/${name}`);
          audio.preload = "auto";
          return audio;
        }),
      };
      pools.set(pool, entry);
      return entry;
    })
    .catch(() => {
      // 枚举失败：池子留空（点了没声音，但页面照常）
      const empty: Pool = { dir: "", audios: [] };
      pools.set(pool, empty);
      return empty;
    })
    .finally(() => {
      loading.delete(pool);
    });

  loading.set(pool, task);
  return task;
}

/** 停掉当前这条（不动池子） */
export function stopVoice(): void {
  if (!current) return;
  try {
    current.pause();
    current.currentTime = 0;
  } catch {
    // ignore
  }
  current = null;
}

function playAudio(audio: HTMLAudioElement): void {
  try {
    audio.volume = settings.volume;
    audio.currentTime = 0;
    const p = audio.play();
    if (p) p.catch(() => {});
    current = audio;
  } catch {
    // ignore
  }
}

function pickRandom(pool: VoicePool, entry: Pool): HTMLAudioElement | null {
  const list = entry.audios;
  if (list.length === 0) return null;
  // 随机但不连续重复同一条（池子只有 1 条时允许重复）
  let idx = Math.floor(Math.random() * list.length);
  if (list.length > 1 && idx === lastIdx.get(pool)) idx = (idx + 1) % list.length;
  lastIdx.set(pool, idx);
  return list[idx];
}

/**
 * 随机播一条。返回"这一下有没有出声"。
 * 池子还没加载好时：先把当前那条掐掉，等加载完再播（点一下就该有回应的手感比"严格同步"重要）。
 */
export function playVoice(pool: VoicePool): boolean {
  if (!settings.enabled) return false;
  // 点它 = 切歌：打断正在播的那条
  stopVoice();

  const cached = pools.get(pool);
  if (cached) {
    const audio = pickRandom(pool, cached);
    if (!audio) return false;
    playAudio(audio);
    return true;
  }

  void preloadVoices(pool).then((entry) => {
    // 加载期间用户可能又点了别的地方 / 关了开关：只在"还开着且当前没在播"时补播
    if (!settings.enabled || current) return;
    const audio = pickRandom(pool, entry);
    if (audio) playAudio(audio);
  });
  return false;
}

/** 把正在播的那条在 ms 毫秒内渐弱到 0（点击开门时用） */
export function fadeVoice(ms: number): void {
  const audio = current;
  if (!audio) return;
  const from = settings.volume;
  const start = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / Math.max(1, ms));
    try {
      audio.volume = from * (1 - t);
    } catch {
      // ignore
    }
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = settings.volume;
      } catch {
        // ignore
      }
      if (current === audio) current = null;
    }
  };
  step();
}

/** 调试/测试用：这个池子现在有几条 */
export function poolSize(pool: VoicePool): number {
  return pools.get(pool)?.audios.length ?? 0;
}

/** 调试/测试用：当前在播的音频 URL */
export function currentVoiceSrc(): string | null {
  if (!current) return null;
  return decodeURIComponent(current.src.split("/").pop() ?? "");
}
