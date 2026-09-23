"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PRIVATE_UI, THEME_ASSETS } from "@/lib/site";
import {
  base64ToBytes,
  normalizePassword,
  type PrivatePayload,
} from "@/lib/privateCrypto";
import { useBg } from "@/components/providers/BgProvider";
import { useIntroSounds } from "@/components/hooks/useIntroSounds";
import FireVision from "@/components/ui/FireVision";

// ============================================================
// 私有文章 · 往生堂门扉（浏览器端解密 + 开门动画）
//
// 锁屏与开屏（IntroOverlay）共用同一套东西：
//   背景 = 博客背景当前图整体虚化（与开屏第二屏同一份 .intro-white-bg / .intro-white-tint）
//   门扉 = 透明底往生堂门图，浮在背景上（不加底衬）
//   下方 = 一条横线口令框，右侧一枚火系神之眼（= 叩门按钮）
//
// 叩对之后的节奏，与开屏"开门"一致（三步，不许抢拍）：
//   ① 门扉先淡出（DOOR_FADE_MS，与开屏 FADE_MS 相同）
//   ② 门扉走完了，Q版胡桃才登场，同时放"起！"+能量充满
//   ③ **等"起！"放完**（playAndWait；素材缺失/被拦截按兜底时长）才卷门帘 → 落在正文上
//
// 口令错误：界面**完全无反应**（只有读屏能听到一句提示）——门就是没动。
// 解锁成功后口令存进 sessionStorage（关标签页失效），同一次浏览里的其它私有文章
// 直接开门不再走动画；「重新上锁」清掉口令并回到文章卡片界面。
// ============================================================

/** 会话级口令缓存键（所有私有文章共用） */
const STORAGE_KEY = "blog-private-pw";
/** 门扉淡出时长（与开屏的 FADE_MS 一致） */
const DOOR_FADE_MS = 900;
/** "起！"放完之前最多等多久（音频时长读不到时的兜底） */
const BURST_FALLBACK_MS = 1600;
/** 收窗帘时长（与开屏的 EXIT_MS 一致） */
const CURTAIN_MS = 900;

type Env = "ok" | "insecure" | "unsupported";
type Status = "locked" | "working" | "opening" | "open";
/** 开门动画的三拍：0 门扉淡出 → 1 胡桃+起！ → 2 卷门帘 */
type OpenStep = 0 | 1 | 2;

/** 口令 + 载荷 → 明文 HTML */
async function decryptBody(
  payload: PrivatePayload,
  password: string
): Promise<string> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizePassword(password)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBytes(payload.salt),
      iterations: payload.iter,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ct)
  );
  return new TextDecoder().decode(plain);
}

export default function PrivateGate({
  payload,
  slug,
  children,
}: {
  payload: PrivatePayload;
  /** 文章 slug：重新上锁后按"回卡片列表并定位到本篇"的既有逻辑返回 */
  slug: string;
  /** 门后内容（内嵌 PDF 附件等）：只在解锁后渲染，锁着时连节点都不存在 */
  children?: ReactNode;
}) {
  // 博客背景当前图（与 BlogBackground / 开屏同源，保证锁屏背景与站点一致）
  const { images, order, idx } = useBg();
  const bgSrc =
    images.length > 0 && order.length > 0 ? images[order[idx]] : null;

  const [status, setStatus] = useState<Status>("locked");
  const [openStep, setOpenStep] = useState<OpenStep>(0);
  const [html, setHtml] = useState("");
  const [password, setPassword] = useState("");
  const [liveMsg, setLiveMsg] = useState("");
  const [autoNote, setAutoNote] = useState("");
  // 初始按"环境正常"渲染（服务端也是这个状态），挂载后再探测 WebCrypto 可用性
  const [env, setEnv] = useState<Env>("ok");
  // 素材缺失兜底（public/hutao 不跟 Git 走，换机器可能缺文件）
  const [chibiBroken, setChibiBroken] = useState(false);
  const [visionBroken, setVisionBroken] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null); // 收窗帘的裁剪对象
  const edgeRef = useRef<HTMLDivElement | null>(null); // 收拢边（跟随裁剪线）
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const envCheckedRef = useRef(false);
  const { playTogether, playAndWait } = useIntroSounds();

  const unlock = useCallback(
    async (pwd: string, fromSession: boolean) => {
      setStatus("working");
      setLiveMsg("");
      try {
        const text = await decryptBody(payload, pwd);
        setHtml(text);
        setPassword("");
        sessionStorage.setItem(STORAGE_KEY, pwd);
        if (fromSession) {
          // 会话里已经记过口令：直接进正文，不再走一遍开门动画
          setAutoNote(PRIVATE_UI.autoUnlocked);
          setStatus("open");
        } else {
          setOpenStep(0);
          setStatus("opening");
        }
      } catch {
        // 口令不对 / 密文被改：界面上什么都不发生
        if (fromSession) sessionStorage.removeItem(STORAGE_KEY);
        setLiveMsg(PRIVATE_UI.silentWrong);
        setStatus("locked");
      }
    },
    [payload]
  );

  // 挂载：探测环境 → 有会话口令就自动开门
  useEffect(() => {
    if (envCheckedRef.current) return;
    envCheckedRef.current = true;
    inputRef.current?.focus({ preventScroll: true });
    if (!window.isSecureContext) {
      setEnv("insecure");
      return;
    }
    if (!window.crypto?.subtle) {
      setEnv("unsupported");
      return;
    }
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) void unlock(saved, true);
  }, [unlock]);

  // 开门动画：门扉淡出 → 胡桃 + "起！" → 等它放完 → 卷门帘 → 正文
  useEffect(() => {
    if (status !== "opening") return;

    let alive = true;
    let raf = 0;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    /** 收窗帘：clip-path 自下而上裁剪 + 收拢边同步上推 */
    const runCurtain = () =>
      new Promise<void>((resolve) => {
        const overlay = overlayRef.current;
        const edge = edgeRef.current;
        const start = performance.now();
        const vh = window.innerHeight;
        const tick = (now: number) => {
          if (!alive) return;
          const p = Math.min(1, (now - start) / CURTAIN_MS);
          if (overlay) {
            overlay.style.clipPath = `inset(0 0 ${(p * 100).toFixed(2)}% 0)`;
          }
          if (edge) {
            edge.style.transform = `translateY(${(-p * vh).toFixed(1)}px)`;
          }
          if (p < 1) raf = requestAnimationFrame(tick);
          else resolve();
        };
        raf = requestAnimationFrame(tick);
      });

    void (async () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setStatus("open");
        return;
      }
      // ① 门扉先走
      await wait(DOOR_FADE_MS);
      if (!alive) return;
      // ② 胡桃登场 + "起！"
      setOpenStep(1);
      playTogether(["burst", "energyFull"]);
      await playAndWait("burst", BURST_FALLBACK_MS);
      if (!alive) return;
      // ③ 卷门帘
      setOpenStep(2);
      await runCurtain();
      if (!alive) return;
      setStatus("open");
    })();

    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf);
    };
  }, [status, playTogether, playAndWait]);

  // 解锁后把焦点移到正文（不触发滚动），方便键盘 / 读屏用户继续读
  useEffect(() => {
    if (status === "open") bodyRef.current?.focus({ preventScroll: true });
  }, [status]);

  const showBody = status === "open" || status === "opening";
  const disabled = status === "working" || env !== "ok";
  const overlayOn = !showBody || status === "opening";

  return (
    <>
      {showBody && (
        <div className="post-gate post-gate--open">
          <div className="post-gate__bar">
            <span className="post-gate__state">
              <span aria-hidden>🔓</span> {PRIVATE_UI.unlocked}
              {autoNote ? ` · ${autoNote}` : ""}
            </span>
            <Link
              href={`/posts?post=${slug}`}
              className="post-gate__relock"
              onClick={() => sessionStorage.removeItem(STORAGE_KEY)}
            >
              {PRIVATE_UI.relock}
            </Link>
          </div>
          <div
            ref={bodyRef}
            tabIndex={-1}
            className="post-gate__body"
            // 明文 HTML 来自构建期序列化（与详情页正文同一套 Block 结构），
            // 已经过转义；GCM 认证标签保证它没被篡改。
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {children}
        </div>
      )}

      {overlayOn ? (
        <div
          ref={overlayRef}
          className={`post-gate__overlay post-gate__overlay--step${openStep}${
            status === "opening" ? " post-gate__overlay--opening" : ""
          }`}
        >
          {/* 背景：博客背景当前图整体虚化（与开屏第二屏同一套样式类） */}
          <div
            className="intro-white-bg"
            style={bgSrc ? { backgroundImage: `url("${bgSrc}")` } : undefined}
            aria-hidden
          />
          <div className="intro-white-tint" aria-hidden />

          <Link
            href={`/posts?post=${slug}`}
            className="post-gate__back"
            onClick={() => sessionStorage.removeItem(STORAGE_KEY)}
          >
            {PRIVATE_UI.back}
          </Link>

          {/* 上半屏：往生堂门扉（透明底，直接浮在背景上）；
              门扉完全淡出之后，Q版胡桃才在同一位置登场（与开屏的先后关系一致） */}
          <div className="post-gate__stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="post-gate__door-img"
              src={THEME_ASSETS.door}
              alt="往生堂门扉"
              draggable={false}
            />
            {openStep >= 1 && !chibiBroken && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="post-gate__chibi"
                src={THEME_ASSETS.chibiBurst}
                alt=""
                aria-hidden
                draggable={false}
                onError={() => setChibiBroken(true)}
              />
            )}
          </div>

          {/* 下半屏：一条横线口令框 + 火系神之眼（叩门） */}
          <form
            className="post-gate__knock"
            onSubmit={(e) => {
              e.preventDefault();
              if (!disabled && password.length > 0) void unlock(password, false);
            }}
          >
            <div className="post-gate__field">
              <input
                ref={inputRef}
                className="post-gate__input"
                type="password"
                name="private-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLiveMsg("");
                }}
                placeholder={PRIVATE_UI.placeholder}
                aria-label={PRIVATE_UI.placeholder}
                autoComplete="current-password"
                disabled={disabled}
              />
              <button
                type="submit"
                className="post-gate__vision"
                aria-label={PRIVATE_UI.knock}
                disabled={disabled || password.length === 0}
              >
                {visionBroken ? (
                  <span className="post-gate__vision-fallback" aria-hidden>
                    🔥
                  </span>
                ) : (
                  <FireVision
                    full={status === "opening"}
                    fireBroken={visionBroken}
                  />
                )}
              </button>
              {/* 素材探针：public/hutao 不跟 Git 走，换机器可能缺文件；
                  探到缺失就把神之眼换成文字兜底（叩门按钮本身照常可用） */}
              <img
                className="visually-hidden"
                src={THEME_ASSETS.vision}
                alt=""
                aria-hidden
                onError={() => setVisionBroken(true)}
              />
            </div>
            {env !== "ok" ? (
              <p className="post-gate__error" role="alert">
                {env === "insecure" ? PRIVATE_UI.insecure : PRIVATE_UI.unsupported}
              </p>
            ) : null}
            {/* 口令错误在界面上毫无反应，只给读屏留一句 */}
            <p className="visually-hidden" role="status" aria-live="polite">
              {status === "working" ? PRIVATE_UI.knocking : liveMsg}
            </p>
          </form>

          {/* 门帘：与开屏同一个收拢边（深红底 + 璃月回纹 + 神之眼）；
              "起！"放完才淡入并卷起，不会在底部先冒出一条边 */}
          <div
            ref={edgeRef}
            className={`intro-curtain-edge post-gate__curtain${
              openStep >= 2 ? " post-gate__curtain--on" : ""
            }`}
            aria-hidden
          >
            {!visionBroken && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="intro-curtain-vision"
                src={THEME_ASSETS.vision}
                alt=""
                aria-hidden
                draggable={false}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
