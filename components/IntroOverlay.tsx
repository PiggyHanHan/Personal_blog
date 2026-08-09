"use client";

import { useEffect, useRef, useState } from "react";
import { getPeriod, type Period } from "@/lib/period";

// ============================================================
// 开屏动画（原神"开门"）
//
// 流程：
//   进站 → 按系统时间选对应时段的素材 → 全屏显示第一帧
//   → 下方"点击任意位置进入" → 点击后加载并播放视频（cover 全屏铺满）
//   → 视频播完淡出，进入博客
//
// 素材在 public/intro/ 下，按时段命名：
//   frame-dawn.jpg + video-dawn.mp4   （清晨 05:00–07:59）
//   frame-day.jpg  + video-day.mp4    （白天 08:00–16:59）
//   frame-dusk.jpg + video-dusk.mp4   （黄昏 17:00–19:59）
//   frame-night.jpg + video-night.mp4 （夜晚 20:00–04:59）
// ============================================================

const INTROS_BY_PERIOD: Record<Period, { frame: string; video: string }> = {
  dawn: { frame: "/intro/frame-dawn.jpg", video: "/intro/video-dawn.mp4" },
  day: { frame: "/intro/frame-day.jpg", video: "/intro/video-day.mp4" },
  dusk: { frame: "/intro/frame-dusk.jpg", video: "/intro/video-dusk.mp4" },
  night: { frame: "/intro/frame-night.jpg", video: "/intro/video-night.mp4" },
};

type Phase =
  | "loading-frame" // 第一帧加载中
  | "frame" // 第一帧已显示，等待点击
  | "loading-video" // 已点击，视频加载中
  | "playing" // 视频播放中
  | "done"; // 播放完毕，淡出

export default function IntroOverlay() {
  const [intro, setIntro] = useState<{ frame: string; video: string } | null>(
    null
  );
  const [phase, setPhase] = useState<Phase>("loading-frame");
  const [failed, setFailed] = useState(false);
  const [gone, setGone] = useState(false); // 淡出结束后彻底卸载
  const [period, setPeriod] = useState<Period>("night");
  const videoRef = useRef<HTMLVideoElement>(null);

  // 按系统时间选素材（useEffect 里取，避免服务端/客户端时间不一致）
  useEffect(() => {
    const hour = new Date().getHours();
    setPeriod(getPeriod(hour));
    setIntro(INTROS_BY_PERIOD[getPeriod(hour)]);
  }, []);

  // 视频放完：先淡出（1s），淡出结束后彻底卸载组件
  useEffect(() => {
    if (phase === "done") {
      const timer = setTimeout(() => setGone(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleClick = () => {
    if (phase !== "frame") return;
    setPhase("loading-video");
    // 点击后才开始加载并播放视频
    videoRef.current?.play().catch(() => setFailed(true));
  };

  // 素材缺失/加载失败时直接跳过开屏；淡出完成后卸载
  if (failed || gone) return null;

  return (
    <div
      className={`intro-overlay intro-overlay--${period}${
        phase === "done" ? " intro-overlay--done" : ""
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="开屏动画，点击任意位置进入"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* 兜底背景：对应时段第一帧虚化（视频加载前不黑屏） */}
      <div className="intro-bg" aria-hidden />

      {/* 第一帧静态图（cover 全屏铺满） */}
      {intro && (
        <img
          className="intro-frame"
          src={intro.frame}
          alt="开屏画面"
          style={{ opacity: phase === "done" ? 0 : 1 }}
          onLoad={() => setPhase((p) => (p === "loading-frame" ? "frame" : p))}
          onError={() => setFailed(true)}
        />
      )}

      {/* 视频：点击后才加载，播放中盖住图片 */}
      {intro && (
        <video
          ref={videoRef}
          className="intro-video"
          src={intro.video}
          preload="none"
          playsInline
          style={{ opacity: phase === "playing" ? 1 : 0 }}
          onCanPlay={() => setPhase("playing")}
          onError={() => setFailed(true)}
          onEnded={() => setPhase("done")}
        />
      )}

      {/* 底部提示文字 */}
      {!intro && <p className="intro-hint">加载中…</p>}
      {phase === "frame" && <p className="intro-hint">点击任意位置进入</p>}
      {phase === "loading-video" && (
        <p className="intro-hint">加载中…</p>
      )}
    </div>
  );
}
