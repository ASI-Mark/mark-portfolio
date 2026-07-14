"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

type PetState = "idle" | "walking" | "sleeping" | "wave" | "thinking";

// Same dock logic as useAvatarState's getDockPosition — walk to the corner,
// outside the centered 720px reading column, before napping.
function getDockPosition(): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const roomRight = vw / 2 - 360;
  const x = roomRight > 100 ? vw - 40 : vw - 24;
  const y = vh - 90;
  return { x, y };
}

interface AvatarCompanionProps {
  onChatOpen: () => void;
  chatOpen: boolean;
}

export default function AvatarCompanion({ onChatOpen, chatOpen }: AvatarCompanionProps) {
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [targetPos, setTargetPos] = useState({ x: 100, y: 100 });
  const [state, setState] = useState<PetState>("idle");
  const [facingLeft, setFacingLeft] = useState(false);
  const [frame, setFrame] = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const dockTimer = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef(0);
  const stateRef = useRef<PetState>("idle");
  const posRef = useRef({ x: 100, y: 100 });
  const targetRef = useRef({ x: 100, y: 100 });

  // Walk to the dock position, then fall asleep once close enough (or after
  // a generous timeout) — never sleep wherever the cursor last left it.
  const dockThenSleep = useCallback(() => {
    if (typeof window === "undefined") return;
    const { x, y } = getDockPosition();
    targetRef.current = { x, y };
    setTargetPos({ x, y });
    stateRef.current = "walking";
    setState("walking");

    const startedAt = Date.now();
    const poll = () => {
      const cur = posRef.current;
      const dx = x - cur.x;
      const dy = y - cur.y;
      const arrived = Math.sqrt(dx * dx + dy * dy) <= 48;
      if (arrived || Date.now() - startedAt > 6000) {
        stateRef.current = "sleeping";
        setState("sleeping");
        return;
      }
      dockTimer.current = setTimeout(poll, 100);
    };
    poll();
  }, []);

  // Shared wake-up: cancel any pending dock/sleep, come back from sleeping,
  // and restart the idle → sleep timer chain. Used by both mouse move and
  // scroll so the avatar never stays dozed off just because the cursor held
  // still while the visitor scrolled.
  const wake = useCallback(() => {
    if (dockTimer.current) {
      clearTimeout(dockTimer.current);
      dockTimer.current = null;
    }
    if (stateRef.current === "sleeping") {
      stateRef.current = "walking";
      setState("walking");
    }

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      stateRef.current = "idle";
      setState("idle");

      idleTimer.current = setTimeout(() => {
        dockThenSleep();
      }, 8000);
    }, 2000);
  }, [dockThenSleep]);

  // Initialize position
  useEffect(() => {
    setMounted(true);
    const startX = window.innerWidth - 120;
    const startY = window.innerHeight - 120;
    setPos({ x: startX, y: startY });
    setTargetPos({ x: startX, y: startY });
    posRef.current = { x: startX, y: startY };
    targetRef.current = { x: startX, y: startY };
  }, []);

  // Track mouse position as target
  useEffect(() => {
    if (!mounted) return;

    function onMouseMove(e: MouseEvent) {
      targetRef.current = { x: e.clientX - 16, y: e.clientY - 16 };
      wake();
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [mounted, wake]);

  // Scroll wakes it up too, same as mouse move — see the shared wake() above.
  useEffect(() => {
    if (!mounted) return;
    function onScroll() {
      wake();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted, wake]);

  // Dim the avatar whenever it's currently overlapping the centered 720px
  // reading column, so it doesn't visually block the text underneath.
  useEffect(() => {
    if (!mounted) return;
    function check() {
      const vw = window.innerWidth;
      const buffer = 40;
      const left = vw / 2 - 360 - buffer;
      const right = vw / 2 + 360 + buffer;
      setDimmed(pos.x > left && pos.x < right);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [mounted, pos.x]);

  // Main animation loop
  useEffect(() => {
    if (!mounted) return;

    const SPEED = 6;
    const CLOSE_ENOUGH = 48;
    let animId: number;
    let lastTime = 0;

    function tick(timestamp: number) {
      animId = requestAnimationFrame(tick);

      // ~60ms per frame (like oneko.js's 100ms but smoother)
      if (timestamp - lastTime < 60) return;
      lastTime = timestamp;

      const current = posRef.current;
      const target = targetRef.current;

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > CLOSE_ENOUGH) {
        // Move toward target
        const moveX = (dx / dist) * SPEED;
        const moveY = (dy / dist) * SPEED;
        const newPos = {
          x: current.x + moveX,
          y: current.y + moveY,
        };
        posRef.current = newPos;
        setPos(newPos);

        // Face direction of movement
        setFacingLeft(dx < 0);

        // Set walking state
        if (stateRef.current !== "walking") {
          stateRef.current = "walking";
          setState("walking");
        }

        // Animate walking frame
        frameRef.current = (frameRef.current + 1) % 4;
        setFrame(frameRef.current);
      } else {
        // Close enough — idle
        if (stateRef.current === "walking") {
          stateRef.current = "idle";
          setState("idle");
        }
      }
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [mounted]);

  // Hide bubble after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || chatOpen) return null;

  // CSS transforms based on state
  const stateTransform = (() => {
    switch (state) {
      case "walking":
        // Bouncy walk: alternate Y offset
        return `translateY(${frame % 2 === 0 ? -3 : 3}px)`;
      case "sleeping":
        return "rotate(20deg) scale(0.85)";
      case "idle":
        return "";
      default:
        return "";
    }
  })();

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: dimmed ? 0.35 : 1,
        transition: `${state === "walking" ? "none" : "left 0.3s, top 0.3s"}, opacity 0.3s ease-out`,
      }}
    >
      {/* Speech bubble */}
      {showBubble && state !== "sleeping" && (
        <div
          className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
          style={{
            background: "#FAFAF8",
            border: "1px solid #E8E6E1",
            borderRadius: 12,
            padding: "6px 12px",
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            color: "#1A1A1A",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            animation: "fadeUp 0.3s ease-out",
          }}
        >
          点击我聊天 👋
          {/* Triangle pointer */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5"
            style={{
              width: 8,
              height: 8,
              background: "#FAFAF8",
              border: "1px solid #E8E6E1",
              borderTop: "none",
              borderLeft: "none",
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </div>
      )}

      {/* Sleeping zzz */}
      {state === "sleeping" && (
        <div
          className="absolute -top-8 -right-2 font-serif text-muted pointer-events-none select-none"
          style={{
            fontSize: 16,
            animation: "zzzFloat 2s ease-in-out infinite",
          }}
        >
          💤
        </div>
      )}

      {/* Avatar — clickable */}
      <button
        type="button"
        onClick={onChatOpen}
        className="pointer-events-auto cursor-pointer block"
        style={{
          width: 64,
          height: 64,
          transform: `${facingLeft ? "scaleX(-1)" : ""} ${stateTransform}`,
          transition: "transform 0.15s ease",
          filter: state === "sleeping"
            ? "brightness(0.8) saturate(0.7)"
            : "drop-shadow(0 3px 8px rgba(0,0,0,0.12))",
        }}
        aria-label="和马克的数字分身聊天"
      >
        <Image
          src="/avatar-nobg.png"
          alt="马克"
          width={64}
          height={64}
          className="object-contain"
          priority
        />
      </button>

      {/* Ground shadow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: state === "sleeping" ? 30 : 40,
          height: 6,
          background: "rgba(0,0,0,0.06)",
          borderRadius: "50%",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}
