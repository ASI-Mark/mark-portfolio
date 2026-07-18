"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { buildEyelidClipPaths } from "@/lib/kaiyanEyelids";

// 第一幕重度依赖 window/canvas，静态导出下只在客户端挂载
const HeroKaiyan = dynamic(() => import("@/components/HeroKaiyan"), {
  ssr: false,
});

const DONE_KEY = "kaiyan_done_v1";

// boot: 尚未读到 localStorage（静默纸色遮罩防闪烁）
// act1: 第一幕进行中（主站挂载但不可见不可交互）
// opening: 眼睑从全黑睁开、主站显露中（HeroKaiyan 已卸载）
// site: 正常主站
type Phase = "boot" | "act1" | "opening" | "site";

export default function ActGate({
  children,
  avatar,
}: {
  children: React.ReactNode;
  /** 第一幕期间不挂载的重交互组件（3D 分身），避免双 rAF 抢帧 */
  avatar?: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("boot");
  const eyelidTopRef = useRef<HTMLDivElement>(null);
  const eyelidBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let done = false;
    try {
      done = localStorage.getItem(DONE_KEY) === "1";
    } catch {
      /* 隐私模式等场景：当首访处理 */
    }
    setPhase(done ? "site" : "act1");
  }, []);

  // 第一幕期间锁滚动
  useEffect(() => {
    const lock = phase === "boot" || phase === "act1";
    document.documentElement.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [phase]);

  // Nav「初心」触发重看第一幕
  useEffect(() => {
    const onReplay = () => {
      try {
        localStorage.removeItem(DONE_KEY);
      } catch {}
      window.scrollTo(0, 0);
      setPhase("act1");
    };
    window.addEventListener("kaiyan:replay", onReplay);
    return () => window.removeEventListener("kaiyan:replay", onReplay);
  }, []);

  // HeroKaiyan 在眼睑全黑时回调；接力棒交给本层的睁眼动画
  const handleDone = useCallback(() => {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {}
    setPhase("opening");
  }, []);

  useEffect(() => {
    if (phase !== "opening") return;
    const top = eyelidTopRef.current;
    const bottom = eyelidBottomRef.current;
    if (!top || !bottom) {
      setPhase("site");
      return;
    }
    const { topPath, bottomPath } = buildEyelidClipPaths(
      window.innerWidth,
      window.innerHeight
    );
    top.style.clipPath = `path("${topPath}")`;
    bottom.style.clipPath = `path("${bottomPath}")`;

    const raf = requestAnimationFrame(() => {
      top.style.transform = "translateY(calc(-100% - 32px))";
      bottom.style.transform = "translateY(calc(100% + 32px))";
    });
    const t = setTimeout(() => setPhase("site"), 480);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [phase]);

  const act1Active = phase === "boot" || phase === "act1";

  return (
    <>
      <div
        aria-hidden={act1Active}
        style={
          act1Active
            ? { visibility: "hidden", pointerEvents: "none" }
            : undefined
        }
      >
        {children}
        {phase === "site" ? avatar : null}
      </div>

      {phase === "boot" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "var(--color-bg)",
          }}
        />
      )}

      {phase === "act1" && <HeroKaiyan onDone={handleDone} />}

      {phase === "opening" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            pointerEvents: "none",
          }}
        >
          {/* 与 HeroKaiyan 的眼睑同几何、同色、同投影：初始闭合（translateY(0)），挂载后睁开 */}
          <div
            ref={eyelidTopRef}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100%",
              height: "78vh",
              background: "var(--color-ink)",
              transform: "translateY(0)",
              transition: "transform 450ms ease-out",
              filter: "drop-shadow(0 8px 20px rgba(0, 0, 0, 0.25))",
            }}
          />
          <div
            ref={eyelidBottomRef}
            style={{
              position: "fixed",
              left: 0,
              bottom: 0,
              width: "100%",
              height: "34vh",
              background: "var(--color-ink)",
              transform: "translateY(0)",
              transition: "transform 450ms ease-out",
              filter: "drop-shadow(0 -8px 20px rgba(0, 0, 0, 0.25))",
            }}
          />
        </div>
      )}
    </>
  );
}
