"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

// ============================================================
// 全局声音设置（音量）
//   - 音量 0~1,持久化到 localStorage(键 blog.sound.volume)
//   - 开屏音效/录音播放前统一应用该音量(见 useIntroSounds)
//   - 左下角设置按钮(SettingsButton)读写这里
// ============================================================

interface SoundState {
  volume: number;
  setVolume: (v: number) => void;
}

const SoundContext = createContext<SoundState>({ volume: 1, setVolume: () => {} });

export const useVolume = () => useContext(SoundContext);

const STORAGE_KEY = "blog.sound.volume";

export default function SoundProvider({ children }: { children: ReactNode }) {
  const [volume, setVolumeState] = useState(1);

  // 挂载后读本地音量(避免 SSR/客户端不一致)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const v = parseFloat(raw);
        if (!Number.isNaN(v)) setVolumeState(Math.min(1, Math.max(0, v)));
      }
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  return (
    <SoundContext.Provider value={{ volume, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
}
