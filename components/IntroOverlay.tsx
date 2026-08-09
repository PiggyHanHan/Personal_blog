"use client";

import { useEffect, useRef, useState } from "react";
import { getPeriod, type Period } from "@/lib/period";
import TeyvatClock from "@/components/TeyvatClock";
import Paimon from "@/components/Paimon";

// ============================================================
// 开幕动画（原神"开门"效果，按真实时间显示不同开屏）
//
// 流程：
//   进站 → 根据系统时间选对应时段的素材 → 先静态显示第一帧图
//   → 下方出现"点击任意位置进入" → 点击后加载并播放视频（约 1s）
//   → 视频播完淡出，露出博客
//
// 素材文件放在 public/intro/ 下，按时间段命名：
//   dawn  清晨 05:00–07:59   frame-dawn.jpg  + video-dawn.mp4
//   day   白天 08:00–16:59   frame-day.jpg   + video-day.mp4
//   dusk  黄昏 17:00–19:59   frame-dusk.jpg  + video-dusk.mp4
//   night 夜晚 20:00–04:59   frame-night.jpg + video-night.mp4
// 图片支持 .jpg / .png / .webp，视频支持 .mp4 / .webm（改路径即可）
// 时间段划分在 lib/period.ts 的 getPeriod() 里，想改随时改。
// ============================================================

const INTROS_BY_PERIOD: Record<Period, { frame: string; video: string }> = {
  dawn: { frame: "/intro/frame-dawn.jpg", video: "/intro/video-dawn.mp4" },
  day: { frame: "/intro/frame-day.jpg", video: "/intro/video-day.mp4" },
  dusk: { frame: "/intro/frame-dusk.jpg", video: "/intro/video-dusk.mp4" },
  night: { frame: "/intro/frame-night.jpg", video: "/intro/video-night.mp4" },
};

type Phase =
  | "loading-frame" // 第一帧图片加载中
  | "frame" // 图片已显示，等待点击
  | "loading-video" // 已点击，视频加载中
  | "playing" // 视频播放中
  | "done"; // 播放完毕，淡出

export default function IntroOverlay() {
  // 用系统时间决定放哪一段开屏（useEffect 里取，避免服务端/客户端时间不一致）
  const [intro, setIntro] = useState<{ frame: string; video: string } | null>(
    null
  );
  const [phase, setPhase] = useState<Phase>("loading-frame");
  const [failed, setFailed] = useState(false);
  const [gone, setGone] = useState(false); // 淡出结束后彻底卸载，防止残留闪现
  // 当前时段：决定放哪段开屏 + 背景图 B（上下填充）
  const [period, setPeriod] = useState<Period>("night");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setPeriod(getPeriod(hour));
    setIntro(INTROS_BY_PERIOD[getPeriod(hour)]);
  }, []);

  // 视频放完：先淡出（1s），淡出结束后把整个开幕组件卸载
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

  // 素材缺失/加载失败时直接跳过开幕；淡出完成后彻底卸载
  if (failed || gone) return null;

  return (
    <div
      className={`intro-overlay intro-overlay--${period}${
        phase === "done" ? " intro-overlay--done" : ""
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="开幕动画，点击任意位置进入"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* 不透明大背景：虚化第一帧，盖住底下博客内容 */}
      <div className="intro-bg" aria-hidden />

      {/* 大背景装饰：左侧提瓦特时钟 + 右侧派蒙 */}
      <TeyvatClock />
      <Paimon />

      {/* 舞台：中央竖屏区域（视频横边充满 + 提示文字） */}
      <div className="intro-stage">
        <div className="intro-stage-media">
          {/* 第一帧静态图（useEffect 之前 intro 为空，先显示黑屏加载） */}
          {intro && (
            <img
              className="intro-frame"
              src={intro.frame}
              alt="开幕画面"
              // 视频一结束就立即隐藏图片，避免淡出期间"闪图"
              style={{ opacity: phase === "done" ? 0 : 1 }}
              onLoad={() =>
                setPhase((p) => (p === "loading-frame" ? "frame" : p))
              }
              onError={() => setFailed(true)}
            />
          )}

          {/* 视频：点击后才开始加载，播放中盖住图片（横边充满） */}
          {intro && (
            <div className="intro-video-wrap">
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
            </div>
          )}
        </div>

        {/* 底部提示文字：紧贴视频画面下方 */}
        {!intro && <p className="intro-hint">加载中…</p>}
        {phase === "frame" && (
          <p className="intro-hint">点击任意位置进入</p>
        )}
        {phase === "loading-video" && (
          <p className="intro-hint">加载中…</p>
        )}
      </div>
    </div>
  );
}
