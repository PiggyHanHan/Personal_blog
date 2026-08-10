"use client";

import { useState } from "react";
import { useVolume } from "@/components/SoundProvider";

// ============================================================
// 全局设置按钮：常驻左下角（开屏/博客页面都可见，z-index 高于开屏）
// 目前只放音频设置（音量滑杆），以后可扩展其他设置项
// ============================================================

export default function SettingsButton() {
  const { volume, setVolume } = useVolume();
  const [open, setOpen] = useState(false);

  return (
    <div className="settings-wrap">
      <button
        type="button"
        className="settings-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="设置"
        aria-expanded={open}
      >
        {/* 齿轮图标 */}
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden focusable="false">
          <path
            fill="currentColor"
            d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98L14.5 2.42a.5.5 0 0 0-.5-.42h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.6.25-1.17.58-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.09.73 1.69.98l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.6-.25 1.17-.58 1.69-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
          />
        </svg>
      </button>

      {open && (
        <div className="settings-panel" role="dialog" aria-label="设置">
          <h4 className="settings-panel__title">设置</h4>
          <label className="settings-row">
            <span className="settings-row__label">音频音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="音量"
            />
            <span className="settings-row__value">{Math.round(volume * 100)}%</span>
          </label>
          <p className="settings-panel__hint">作用于开屏音效与胡桃语音</p>
        </div>
      )}
    </div>
  );
}
