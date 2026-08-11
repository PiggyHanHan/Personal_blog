"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBg } from "@/components/providers/BgProvider";
import { useIntroSounds } from "@/components/hooks/useIntroSounds";

// ============================================================
// 开屏动画（胡桃 · 往生堂"开门"）
//
// 流程：
//   进站 → 全屏显示往生堂开门图样，底部有 Q版胡桃（点击随机播录音）
//   → 点击任意位置（胡桃除外）→ 往生堂整张淡出 + 白屏淡入（"开门"）
//     （若录音在播，1s 内渐弱结束）
//   → 白屏上 Q版胡桃淡入浮现，屏幕下侧出现加载进度条
//     （进度条左右各一枚璃月火系神之眼装饰）
//   → 白屏装饰 = 博客背景的当前图（与 BlogBackground 同一轮播源）整体虚化
//   → 进度条走完（模拟推进 + 真实预加载资源，就绪才收尾）
//   → Q版胡桃切换成第二张（chibi2.png），同一时刻播放"起!"+ 能量充满音效，
//     进度条淡出，停留后整屏淡出进入博客
//
// 素材在 public/hutao/ 下，按"使用中 / 待用库"分两大类
// （见 public/hutao/README.txt）：
//   使用中/背景/door.png          往生堂开门图样（第一屏，全屏铺满）
//   使用中/小素材/chibi1.png      Q版胡桃（白屏阶段第一张）
//   使用中/小素材/chibi2.png      Q版胡桃（进度条加载完后的第二张）
//   使用中/小素材/第一屏胡桃.png  第一屏点我说话的 Q版胡桃（随机播录音）
//   使用中/小素材/火系神之眼.png  璃月火系神之眼（进度条左右两侧）
//   使用中/小素材/火元素图样.png  火元素图样（神之眼周围摆动式外溢）
// 音效 3 点位 + 录音约定见 使用中/音效、使用中/录音 下的 README.txt
// ============================================================

const ASSETS = {
  door: "/hutao/使用中/背景/door.png",
  chibi: "/hutao/使用中/小素材/chibi1.png",
  chibi2: "/hutao/使用中/小素材/chibi2.png",
  vision: "/hutao/使用中/小素材/火系神之眼.png",
  fire: "/hutao/使用中/小素材/火元素图样.png",
  tapChibi: "/hutao/使用中/小素材/第一屏胡桃.png", // 第一屏点我说话的 Q版胡桃
};

type Phase =
  | "loading-door" // 往生堂图加载中
  | "door" // 往生堂图已显示，等待点击
  | "fade" // 已点击：往生堂淡出 + 白屏淡入
  | "loading" // 白屏：Q版胡桃 + 加载进度条
  | "swap" // 进度满：胡桃换成第二张，停留后进入
  | "done"; // 白屏淡出

const FADE_MS = 900; // 往生堂 ↔ 白屏交叉过渡时长
const LOAD_MIN_MS = 2200; // 进度条模拟推进总时长
const LOAD_WAIT_MS = 1500; // 进度满后最多再等真实资源多久
const SWAP_HOLD_MS = 2800; // 第二张胡桃停留时长（chibi2 淡入 0.8s 后完整展示约 2s）
const EXIT_MS = 900; // 白屏淡出时长

// 单个神之眼单元：光效光晕（加载中脉动，完成后定格最大）+ 火元素粒子（完成时随机外溢）
function VisionUnit({
  mirror,
  full,
  fireBroken,
}: {
  mirror?: boolean;
  full?: boolean;
  fireBroken?: boolean;
}) {
  // 每次开屏随机一组粒子：随机角度 + 随机距离（50~80px），delay 均匀错开形成陆续感
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        angle: Math.floor(Math.random() * 360),
        dist: 50 + Math.floor(Math.random() * 30),
        delay: (i / 6) * 2 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <span
      className={`intro-vision-wrap${mirror ? " intro-vision-wrap--mirror" : ""}${
        full ? " intro-vision-wrap--full" : ""
      }`}
    >
      <span className="intro-vision-glow" aria-hidden />
      {/* 火元素纹样：进度条满后才出现，多枚粒子从宝石中心向随机方向陆续外溢后消失 */}
      {!fireBroken && full && (
        <>
          {particles.map((p, i) => (
            <img
              key={i}
              className="intro-fire-particle"
              src={ASSETS.fire}
              alt=""
              aria-hidden
              draggable={false}
              style={
                {
                  "--dir": `${p.angle}deg`,
                  "--dist": `${p.dist}px`,
                  animationDelay: `${p.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </>
      )}
      <img
        className="intro-vision"
        src={ASSETS.vision}
        alt=""
        aria-hidden
        draggable={false}
      />
    </span>
  );
}

export default function IntroOverlay() {
  // 博客背景当前图（与 BlogBackground 共享同一轮播源，保证白屏装饰与博客背景同步）
  const { images, order, idx } = useBg();
  const bgSrc =
    images.length > 0 && order.length > 0 ? images[order[idx]] : null;

  const [phase, setPhase] = useState<Phase>("loading-door");
  const [doorLoaded, setDoorLoaded] = useState(false);
  const [doorFailed, setDoorFailed] = useState(false);
  // 白屏资源缺失标记（挂载即预加载时确定，缺图则不渲染对应元素，避免破图图标）
  const [chibiBroken, setChibiBroken] = useState(false);
  const [chibi2Broken, setChibi2Broken] = useState(false);
  const [visionBroken, setVisionBroken] = useState(false);
  const [fireBroken, setFireBroken] = useState(false);
  const [tapChibiBroken, setTapChibiBroken] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preloadDone, setPreloadDone] = useState(false);
  const [gone, setGone] = useState(false); // 淡出结束后彻底卸载
  const [doorPressed, setDoorPressed] = useState(false); // 点击瞬间的"按门"反馈
  const [chibiBouncing, setChibiBouncing] = useState(false); // 点胡桃的 Q弹反馈

  const progressRef = useRef(0);
  const preloadDoneRef = useRef(false);
  const loadEndRef = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null); // 收窗帘过渡裁剪对象
  const curtainEdgeRef = useRef<HTMLDivElement>(null); // 收拢边,跟随裁剪线

  const { play, playTogether, playRandomVoice, fadeOutVoice } = useIntroSounds();
  const prevPhaseRef = useRef<Phase | null>(null);

  // 预览/测试辅助：URL 带 ?skipIntro=1 时挂载后立即移除开屏（正常访问不受影响）
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("skipIntro")) {
      setGone(true);
    }
  }, []);

  // 点击：往生堂开始淡出、白屏开始淡入,并触发"按门"反馈动画与开门音效
  const handleClick = () => {
    if (phase !== "door") return;
    setDoorPressed(true);
    setPhase("fade");
  };

  // 第一屏点 Q版胡桃：随机播一个录音 + 胡桃 Q弹反馈（不触发开门；播放中再点会打断重随机）
  const handleTapChibi = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 先重置再触发，保证连点也能重播 Q弹动画
    setChibiBouncing(false);
    requestAnimationFrame(() => setChibiBouncing(true));
    playRandomVoice();
  };

  // 音效：phase 切换时播放对应点位（文件缺失/被拦截时静默跳过）。
  // 点击开门(fade)同时让正在播的录音 1s 渐弱结束
  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    prevPhaseRef.current = phase;
    switch (phase) {
      case "fade":
        // 开门音 + 欢迎语("你很有眼光嘛!")同时播放;录音 1s 渐弱结束
        playTogether(["doorOpen", "greeting"]);
        fadeOutVoice(1000);
        break;
      case "swap":
        // 胡桃切换第二张("起!") + 神之眼点亮(能量充满) 同步播放
        playTogether(["burst", "energyFull"]);
        break;
    }
  }, [phase, play, playTogether, fadeOutVoice]);

  // 往生堂图就绪（onLoad 在 hydration 前可能已触发丢失，用 complete 兜底）
  useEffect(() => {
    if (phase === "loading-door" && doorLoaded) setPhase("door");
  }, [phase, doorLoaded]);

  // 往生堂图缺失/加载失败：跳过第一屏，直接进入白屏加载阶段（避免卡死在全白屏）
  useEffect(() => {
    if (doorFailed && phase === "loading-door") setPhase("loading");
  }, [doorFailed, phase]);

  // 交叉过渡结束后进入白屏加载阶段
  useEffect(() => {
    if (phase !== "fade") return;
    const t = setTimeout(() => setPhase("loading"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // 挂载即预加载白屏所需图片（chibi1 / chibi2 / vision）：
  // 点击前就把缺失情况摸清，白屏渲染时直接条件判断，不会出现破图图标闪烁
  // （SSR 期间丢失的 error 事件也不依赖——这里用 naturalWidth 判断是否成功）
  useEffect(() => {
    let alive = true;
    let done = 0;
    const total = 5;
    const markDone = () => {
      done += 1;
      if (done >= total) {
        preloadDoneRef.current = true;
        if (alive) setPreloadDone(true);
      }
    };
    const check = (src: string, img: HTMLImageElement) => {
      if (img.naturalWidth === 0) {
        if (src === ASSETS.chibi) setChibiBroken(true);
        else if (src === ASSETS.chibi2) setChibi2Broken(true);
        else if (src === ASSETS.vision) setVisionBroken(true);
        else if (src === ASSETS.fire) setFireBroken(true);
        else setTapChibiBroken(true);
      }
    };
    [ASSETS.chibi, ASSETS.chibi2, ASSETS.vision, ASSETS.fire, ASSETS.tapChibi].forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        check(src, img);
        markDone();
      };
      img.src = src;
    });
    return () => {
      alive = false;
    };
  }, []);

  // 白屏加载阶段：rAF 模拟进度条推进（easeInOut，约 LOAD_MIN_MS 到 100%）。
  // 进度满后：资源已预加载完就收尾，否则最多再等 LOAD_WAIT_MS 强制收尾
  useEffect(() => {
    if (phase !== "loading") return;

    let alive = true;
    progressRef.current = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (!alive) return;
      const t = Math.min(1, (now - start) / LOAD_MIN_MS);
      // easeInOutCubic：前段快、后段慢，"磨蹭"一下更像真实加载
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      progressRef.current = Math.round(eased * 100);
      setProgress(progressRef.current);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        loadEndRef.current = performance.now();
      }
    };
    requestAnimationFrame(tick);

    // 进度满后轮询收尾条件
    const finishTimer = setInterval(() => {
      if (!alive) return;
      const elapsed = performance.now() - loadEndRef.current;
      const canFinish =
        loadEndRef.current > 0 &&
        (preloadDoneRef.current || elapsed >= LOAD_WAIT_MS);
      if (canFinish) setPhase("swap");
    }, 100);

    return () => {
      alive = false;
      clearInterval(finishTimer);
    };
  }, [phase]);

  // 第二张胡桃停留 SWAP_HOLD_MS 后进入"白屏淡出"
  useEffect(() => {
    if (phase !== "swap") return;
    const t = setTimeout(() => setPhase("done"), SWAP_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // 收窗帘过渡：从底部向上裁剪 overlay,收拢边跟随推进;结束后彻底卸载
  useEffect(() => {
    if (phase !== "done") return;
    // 系统"减弱动态效果"时直接跳过过渡
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGone(true);
      return;
    }
    const overlay = overlayRef.current;
    const edge = curtainEdgeRef.current;
    let alive = true;
    const start = performance.now();
    const vh = window.innerHeight;
    const tick = (now: number) => {
      if (!alive) return;
      const p = Math.min(1, (now - start) / EXIT_MS);
      if (overlay) {
        overlay.style.clipPath = `inset(0 0 ${(p * 100).toFixed(2)}% 0)`;
      }
      if (edge) {
        edge.style.transform = `translateY(${(-p * vh).toFixed(1)}px)`;
      }
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        setGone(true);
      }
    };
    requestAnimationFrame(tick);
    return () => {
      alive = false;
    };
  }, [phase]);

  if (gone) return null;

  const whiteOn =
    phase === "fade" ||
    phase === "loading" ||
    phase === "swap" ||
    phase === "done";
  const inLoading = phase === "loading" || phase === "swap" || phase === "done";
  const showingChibi2 = phase === "swap" || phase === "done";

  return (
    <div
      ref={overlayRef}
      className={`intro-overlay${phase === "done" ? " intro-overlay--done" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="开屏动画，点击任意位置进入"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* 第一屏：往生堂开门图样（cover 全屏铺满） */}
      {!doorFailed && (
        <img
          className={`intro-door${doorPressed ? " intro-door--pressed" : ""}`}
          src={ASSETS.door}
          alt="往生堂"
          draggable={false}
          style={{
            opacity:
              phase === "loading-door" || phase === "door" ? 1 : 0,
          }}
          onLoad={() => setDoorLoaded(true)}
          onError={() => setDoorFailed(true)}
          ref={(el) => {
            // 图片可能在 React 挂载事件前就已加载完（缓存/SSR），此时 onLoad 不会再触发
            if (el && el.complete) setDoorLoaded(true);
          }}
        />
      )}

      {/* 第一屏 Q版胡桃：点击随机播录音（不触发开门） */}
      {!doorFailed && !tapChibiBroken && (phase === "loading-door" || phase === "door") && (
        <button
          type="button"
          className={`intro-tap-chibi${
            chibiBouncing ? " intro-tap-chibi--bounce" : ""
          }`}
          onClick={handleTapChibi}
          onAnimationEnd={() => setChibiBouncing(false)}
          aria-label="点我说话"
        >
          <img src={ASSETS.tapChibi} alt="Q版胡桃" draggable={false} />
        </button>
      )}

      {/* 白屏阶段：博客背景虚化装饰 + Q版胡桃 + 欢迎语 + 神之眼进度条 */}
      <div
        className={`intro-white${whiteOn ? " intro-white--show" : ""}`}
        aria-hidden={!inLoading}
      >
        {/* 博客背景当前图虚化（与 BlogBackground 同一轮播源，始终同步） */}
        <div
          className="intro-white-bg"
          style={bgSrc ? { backgroundImage: `url("${bgSrc}")` } : undefined}
          aria-hidden
        />
        <div className="intro-white-tint" aria-hidden />

        <div className="intro-white-main">
          {/* 第一张胡桃：swap 阶段淡出（第二张缺失时保留显示） */}
          {preloadDone && !chibiBroken && (
            <img
              className={`intro-chibi${
                phase === "swap" && !chibi2Broken
                  ? " intro-chibi--exit"
                  : ""
              }`}
              src={ASSETS.chibi}
              alt="Q版胡桃"
              draggable={false}
            />
          )}
          {/* 第二张胡桃：进度加载完后淡入替换 */}
          {preloadDone && !chibi2Broken && showingChibi2 && (
            <img
              className="intro-chibi intro-chibi2"
              src={ASSETS.chibi2}
              alt="Q版胡桃"
              draggable={false}
            />
          )}
          <p className="intro-welcome">往生堂 · 欢迎光临</p>
        </div>

        <div className="intro-loading">
          {preloadDone && !visionBroken && (
            <>
              <VisionUnit
                full={phase === "swap" || phase === "done"}
                fireBroken={fireBroken}
              />
              <div
                className={`intro-track${
                  phase === "swap" || phase === "done"
                    ? " intro-track--hide"
                    : ""
                }`}
              >
                <div
                  className="intro-track__fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <VisionUnit
                mirror
                full={phase === "swap" || phase === "done"}
                fireBroken={fireBroken}
              />
            </>
          )}
          {/* 神之眼缺失时只显示进度条；预加载完成前同样只显示进度条（避免破图闪烁） */}
          {(!preloadDone || visionBroken) && (
            <div
              className={`intro-track${
                phase === "swap" || phase === "done" ? " intro-track--hide" : ""
              }`}
            >
              <div
                className="intro-track__fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        {inLoading && (
          <p
            className={`intro-percent${
              phase === "swap" || phase === "done"
                ? " intro-percent--hide"
                : ""
            }`}
          >
            {progress}%
          </p>
        )}
      </div>

      {/* 第一屏底部提示 */}
      {!doorFailed && phase === "loading-door" && (
        <p className="intro-hint">加载中…</p>
      )}
      {!doorFailed && phase === "door" && (
        <p className="intro-hint">点击任意位置进入</p>
      )}

      {/* 收窗帘过渡的收拢边：跟随裁剪线向上推进，底部中间一枚璃月神之眼 */}
      <div className="intro-curtain-edge" ref={curtainEdgeRef} aria-hidden>
        {!visionBroken && (
          <img
            className="intro-curtain-vision"
            src={ASSETS.vision}
            alt=""
            aria-hidden
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
