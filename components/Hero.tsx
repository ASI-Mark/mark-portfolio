"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";
import {
  calculateCoverage,
  type Circle,
} from "@/lib/flashlightReveal";

const content = staticContent as StaticContent;

const RADIUS = 60;
const FULL_REVEAL_THRESHOLD = 0.9; // 90% of text area = full reveal + completed
const MAX_POINTS = 800;
const NIGHT_COLOR = "#0a0a0a";

type FlashTransform = {
  x: number;
  y: number;
  rotate: number;
  opacity: number;
  scale: number;
};

const ORIGIN: FlashTransform = { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 };

export default function Hero() {
  // --- Typing ---
  const [visibleChars, setVisibleChars] = useState(0);
  const fullText = content.hook.lines.join("\n");
  const totalChars = fullText.length;

  useEffect(() => {
    if (visibleChars >= totalChars) return;
    const timer = setTimeout(() => {
      setVisibleChars((prev) => prev + 1);
    }, 80);
    return () => clearTimeout(timer);
  }, [visibleChars, totalChars]);

  const typingLines = fullText.slice(0, visibleChars).split("\n");
  const typingComplete = visibleChars >= totalChars;

  // --- Flashlight ---
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const bigTextRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const visitedPointsRef = useRef<Circle[]>([]);
  const lastMaskUpdateRef = useRef(0);
  const [maskUrl, setMaskUrl] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [flashPos, setFlashPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [revealed, setRevealed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Touch devices have no right-click, so "右键复位" is meaningless there.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // Track the current transform purely in a ref — no React state, no
  // framer-motion, no re-render churn. The DOM element is always the
  // source of truth for flashlight position.
  const currentTransformRef = useRef<FlashTransform>({ ...ORIGIN });

  const dragRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const rebuildMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const rect = section.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of visitedPointsRef.current) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.65, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    setMaskUrl(canvas.toDataURL());
  }, []);

  function writeTransform(t: FlashTransform, transitionMs = 0) {
    const el = flashRef.current;
    if (!el) return;
    el.style.transition =
      transitionMs > 0
        ? `transform ${transitionMs}ms ease-out, opacity ${transitionMs}ms ease-out`
        : "none";
    el.style.transform = `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`;
    el.style.opacity = String(t.opacity);
    currentTransformRef.current = { ...t };
  }

  function animateTo(target: FlashTransform, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const el = flashRef.current;
      if (!el) {
        resolve();
        return;
      }
      // First set transition, then on next frame write the target transform
      // so the browser registers the starting state and runs the transition.
      el.style.transition = `transform ${durationMs}ms ease-out, opacity ${durationMs}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.transform = `translate(${target.x}px, ${target.y}px) rotate(${target.rotate}deg) scale(${target.scale})`;
        el.style.opacity = String(target.opacity);
        currentTransformRef.current = { ...target };
        setTimeout(resolve, durationMs + 30);
      });
    });
  }

  function recordScanPoint(clientX: number, clientY: number) {
    if (revealed || completed || !sectionRef.current || !typingComplete) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setFlashPos({ x, y });

    const prev = visitedPointsRef.current[visitedPointsRef.current.length - 1];
    if (prev) {
      const dx = prev.x - x;
      const dy = prev.y - y;
      if (dx * dx + dy * dy < 64) return;
    }

    visitedPointsRef.current.push({ x, y, r: RADIUS });
    if (visitedPointsRef.current.length > MAX_POINTS) {
      visitedPointsRef.current.shift();
    }

    const now = performance.now();
    if (now - lastMaskUpdateRef.current > 50) {
      lastMaskUpdateRef.current = now;
      rebuildMask();

      // Use the BIG revealed text bounding box for coverage — that's
      // what the user is actually scanning across during night mode.
      const targetEl = bigTextRef.current;
      if (targetEl) {
        const tr = targetEl.getBoundingClientRect();
        const tLeft = tr.left - rect.left;
        const tTop = tr.top - rect.top;
        const tW = tr.width;
        const tH = tr.height;
        const nearby = visitedPointsRef.current
          .filter(
            (p) =>
              p.x >= tLeft - RADIUS &&
              p.x <= tLeft + tW + RADIUS &&
              p.y >= tTop - RADIUS &&
              p.y <= tTop + tH + RADIUS
          )
          .map((p) => ({ x: p.x - tLeft, y: p.y - tTop, r: p.r }));
        const cov = calculateCoverage(nearby, tW, tH);
        setScanProgress(Math.min(1, cov / FULL_REVEAL_THRESHOLD));
      }
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (revealed || completed || !typingComplete) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const cur = currentTransformRef.current;
    dragRef.current = {
      pointerId: e.pointerId,
      pointerX: e.clientX,
      pointerY: e.clientY,
      origX: cur.x,
      origY: cur.y,
    };
    setDragging(true);
    writeTransform({ ...cur, scale: 1.15 }, 0);
    window.dispatchEvent(new Event("avatar:pause"));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.origX + (e.clientX - d.pointerX);
    const ny = d.origY + (e.clientY - d.pointerY);
    writeTransform(
      { x: nx, y: ny, rotate: 0, opacity: 1, scale: 1.15 },
      0
    );
    recordScanPoint(e.clientX, e.clientY);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture(d.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;

    const didScan = visitedPointsRef.current.length > 0;
    if (!didScan || revealed || completed) {
      const cur = currentTransformRef.current;
      writeTransform({ ...cur, scale: 1 }, 150);
      setDragging(false);
      setFlashPos(null);
      window.dispatchEvent(new Event("avatar:resume"));
      return;
    }

    // Check if user scanned enough for full reveal
    const isFullReveal = scanProgress >= 1;
    setRevealed(true);
    setDragging(false);
    setFlashPos(null);
    window.dispatchEvent(new Event("avatar:resume"));

    if (isFullReveal) {
      // Full reveal: show all big text → drop → reset → extinguish
      void endReveal(true);
    } else {
      // Partial: show what was scanned for 1.5s → fade back → reset flashlight (keep halo)
      void endReveal(false);
    }
  }

  async function endReveal(isComplete: boolean) {
    try {
      // Show scanned text (or full text) on dark bg for 1.5s
      await new Promise((r) => setTimeout(r, 1500));

      // Fade out
      setFadeOut(true);
      await new Promise((r) => setTimeout(r, 900));

      // Drop flashlight
      const cur = currentTransformRef.current;
      await animateTo(
        { x: cur.x, y: cur.y + 140, rotate: 28, opacity: 0.55, scale: 1 },
        550
      );
      await new Promise((r) => setTimeout(r, 200));

      // Reset to origin
      await animateTo(ORIGIN, 450);

      // Clean up
      setRevealed(false);
      setFadeOut(false);
      setDragging(false);
      setFlashPos(null);
      visitedPointsRef.current = [];
      setMaskUrl("");
      setScanProgress(0);

      if (isComplete) {
        // Full reveal achieved: extinguish halo, disable drag
        setCompleted(true);
      }
      // If partial: flashlight is back at origin with halo still active — user can try again

      window.dispatchEvent(new Event("avatar:resume"));
    } catch (err) {
      console.error("[flash] endReveal error:", err);
    }
  }

  async function resetAll() {
    setRevealed(false);
    setFadeOut(false);
    setDragging(false);
    setFlashPos(null);
    dragRef.current = null;
    visitedPointsRef.current = [];
    setMaskUrl("");
    window.dispatchEvent(new Event("avatar:resume"));
    await animateTo(ORIGIN, 500);
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    void resetAll();
  }

  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("avatar:resume"));
    };
  }, []);

  const nightActive = dragging || (revealed && !fadeOut);

  return (
    <section
      ref={sectionRef}
      id="hero"
      onContextMenu={onContextMenu}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden"
    >
      <canvas ref={maskCanvasRef} className="hidden" aria-hidden="true" />

      <div
        ref={textRef}
        className="relative z-[1] space-y-3 transition-opacity"
        style={{
          opacity: nightActive ? 0 : 1,
          transitionDuration: nightActive ? "300ms" : "800ms",
        }}
      >
        {content.hook.lines.map((line, i) => (
          <p
            key={i}
            className="font-serif text-3xl md:text-5xl text-ink leading-relaxed tracking-wide"
          >
            {typingLines[i] || ""}
            {!typingComplete && i === typingLines.length - 1 && (
              <span className="animate-pulse text-accent">|</span>
            )}
          </p>
        ))}
      </div>

      <div
        className="absolute inset-0 pointer-events-none z-[2] transition-opacity duration-500"
        style={{
          background: NIGHT_COLOR,
          opacity: nightActive ? 1 : 0,
        }}
      />

      {dragging && flashPos && (
        <div
          className="absolute inset-0 pointer-events-none z-[3]"
          style={{
            background: `radial-gradient(circle ${RADIUS * 1.3}px at ${flashPos.x}px ${flashPos.y}px, rgba(255,230,180,0.22) 0%, rgba(255,230,180,0.08) 45%, transparent 75%)`,
          }}
        />
      )}


      {/* Progress bar — positioned between text and flashlight */}
      {dragging && scanProgress > 0 && (
        <div className="absolute top-[62%] left-1/2 -translate-x-1/2 z-[5] pointer-events-none flex flex-col items-center gap-1">
          <div
            className="w-40 h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${Math.min(100, scanProgress * 100)}%`,
                background:
                  scanProgress >= 1
                    ? "rgba(120,255,180,0.8)"
                    : "rgba(255,230,180,0.7)",
              }}
            />
          </div>
          {scanProgress >= 1 && (
            <span
              className="font-sans text-[10px] tracking-widest"
              style={{ color: "rgba(120,255,180,0.8)" }}
            >
              松手揭晓
            </span>
          )}
        </div>
      )}

      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[4]"
        style={{
          // Full reveal (scanProgress >= 1): remove mask → show ALL big text
          // Partial: keep mask → only show scanned areas
          WebkitMaskImage:
            revealed && !fadeOut && scanProgress >= 1
              ? "none"
              : maskUrl
              ? `url(${maskUrl})`
              : "none",
          maskImage:
            revealed && !fadeOut && scanProgress >= 1
              ? "none"
              : maskUrl
              ? `url(${maskUrl})`
              : "none",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          opacity:
            revealed && !fadeOut ? 1 : nightActive && maskUrl ? 1 : 0,
          transition: fadeOut ? "opacity 1s" : "opacity 0.3s",
        }}
      >
        <div ref={bigTextRef} className="flex flex-col items-center">
          <p
            className="font-serif text-5xl md:text-7xl leading-tight"
            style={{ color: "#fafaf8" }}
          >
            你想要
          </p>
          <p
            className="font-serif text-5xl md:text-7xl leading-tight mt-3"
            style={{ color: "#fafaf8" }}
          >
            怎样活这一生?
          </p>
        </div>
      </div>

      <div
        className={`relative z-[1] mt-24 text-sm font-sans text-muted tracking-widest transition-opacity duration-1000 ${
          typingComplete && !nightActive ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>

      {typingComplete && (
        <div className="absolute bottom-40 left-0 right-0 flex justify-center pointer-events-none z-[80]">
          <div
            ref={flashRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`pointer-events-auto select-none flex flex-col items-center gap-2 ${
              completed ? "cursor-default" : "cursor-grab active:cursor-grabbing"
            }`}
            // Transform/opacity/transition are NOT in React style — they
            // are driven imperatively via writeTransform/animateTo to avoid
            // React re-renders wiping them during the reveal sequence.
            style={{ touchAction: "none" }}
            aria-label={isTouch ? "手电筒——拖动我扫过文字" : "手电筒——拖动我扫过文字，右键复位"}
          >
            {!dragging && !revealed && !completed && (
              <>
                <span
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,220,150,0.55) 0%, transparent 70%)",
                    animation: "flashlightPulse 1.8s ease-in-out infinite",
                    width: 90,
                    height: 90,
                    top: -28,
                    left: -28,
                  }}
                />
                <span
                  className="absolute pointer-events-none rounded-full border border-accent/50"
                  style={{
                    animation: "flashlightRing 1.8s ease-out infinite",
                    width: 90,
                    height: 90,
                    top: -28,
                    left: -28,
                  }}
                />
              </>
            )}
            <span
              className="text-4xl relative z-[1] transition-all duration-500"
              style={{
                filter: completed ? "grayscale(0.6) brightness(0.85)" : "none",
              }}
            >
              🔦
            </span>
            {!completed && (
              <span
                className="font-sans text-[10px] tracking-widest whitespace-nowrap pointer-events-none"
                style={{ color: nightActive ? "#ccc" : "#888" }}
              >
                拖动我{!isTouch && " · 右键复位"}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
