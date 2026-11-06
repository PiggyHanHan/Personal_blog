"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { configureVoice } from "@/lib/voicePlayer";

// ============================================================
// 全局声音设置（音量 + 胡桃语音总开关）
//   - 音量 0~1,持久化到 localStorage(键 blog.sound.volume)
//   - 胡桃语音开关,持久化到 localStorage(键 blog.sound.voice,默认开)
//     （计划 9.1 要求"必须带开关"：关掉后点 Q版胡桃 / 点侧边栏神之眼都不出声，
//       开屏音效与门扉音效不受影响）
//   - 开屏音效/录音播放前统一应用该音量(见 useIntroSounds 与 lib/voicePlayer.ts)
//   - 右下角设置按钮(SettingsButton)读写这里
// ============================================================

interface SoundState {
  volume: number;
  setVolume: (v: number) => void;
  /** 胡桃语音（点胡桃 / 点神之眼的随机台词）总开关 */
  voiceEnabled: boolean;
  setVoiceEnabled: (on: boolean) => void;
}

const SoundContext = createContext<SoundState>({
  volume: 1,
  setVolume: () => {},
  voiceEnabled: true,
  setVoiceEnabled: () => {},
});

export const useVolume = () => useContext(SoundContext);

const VOLUME_KEY = "blog.sound.volume";
const VOICE_KEY = "blog.sound.voice";

export default function SoundProvider({ children }: { children: ReactNode }) {
  const [volume, setVolumeState] = useState(1);
  const [voiceEnabled, setVoiceEnabledState] = useState(true);

  // 挂载后读本地设置(避免 SSR/客户端不一致)
  useEffect(() => {
    try {
      const rawVolume = localStorage.getItem(VOLUME_KEY);
      if (rawVolume !== null) {
        const v = parseFloat(rawVolume);
        if (!Number.isNaN(v)) setVolumeState(Math.min(1, Math.max(0, v)));
      }
      const rawVoice = localStorage.getItem(VOICE_KEY);
      if (rawVoice !== null) setVoiceEnabledState(rawVoice !== "0");
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const setVoiceEnabled = useCallback((on: boolean) => {
    setVoiceEnabledState(on);
    try {
      localStorage.setItem(VOICE_KEY, on ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  // 把音量与开关同步给语音播放器（它是个模块级单例，不在这棵 React 树里）
  useEffect(() => {
    configureVoice({ volume, enabled: voiceEnabled });
  }, [volume, voiceEnabled]);

  return (
    <SoundContext.Provider value={{ volume, setVolume, voiceEnabled, setVoiceEnabled }}>
      {children}
    </SoundContext.Provider>
  );
}
