"use client";

import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// --- Pure reducer (testable without DOM) ---

export type Animation =
  | "idle" | "walk" | "wave" | "sit" | "sleep" | "jump"
  | "dance" | "silly" | "robot" | "freeze"
  | "thinking" | "bored" | "excited" | "happy";
export type Zone = "hero" | "works" | "beliefs" | "mind" | "recent" | "timeline" | "map" | "guestbook" | "footer" | null;

export interface AvatarStateData {
  animation: Animation;
  posX: number;
  posY: number;
  targetX: number;
  targetY: number;
  facingLeft: boolean;
  activeZone: Zone;
}

export type AvatarAction =
  | { type: "MOUSE_MOVE"; x: number; y: number }
  | { type: "SET_POS"; x: number; y: number }
  | { type: "SET_ANIM"; animation: Animation }
  | { type: "TICK" }
  | { type: "IDLE_TIMEOUT" }
  | { type: "SIT_TIMEOUT" }
  | { type: "SLEEP_TIMEOUT" }
  | { type: "CLICK" }
  | { type: "WAVE_DONE" }
  | { type: "ZONE_ENTER"; zone: Exclude<Zone, null> }
  | { type: "ZONE_EXIT" }
  | { type: "DOCK"; x: number; y: number };

const SPEED = 6;
const CLOSE_ENOUGH = 48;

export function initialState(): AvatarStateData {
  return {
    animation: "idle",
    posX: 0,
    posY: 0,
    targetX: 0,
    targetY: 0,
    facingLeft: false,
    activeZone: null,
  };
}

// Zone signature sequences — each zone plays a sequence of animations totaling ~5s
// (except hero: just 2.5s wave, footer: skip to sleep directly)
export interface SequenceStep {
  animation: Animation;
  duration: number; // ms
}

export const ZONE_SEQUENCE: Record<string, SequenceStep[]> = {
  hero:      [{ animation: "wave", duration: 2500 }],                                         // 门面
  works:     [{ animation: "dance", duration: 5000 }],                                        // 作品：Hip Hop
  beliefs:   [{ animation: "thinking", duration: 3000 }, { animation: "bored", duration: 2000 }],// 思想
  mind:      [{ animation: "silly", duration: 5000 }],                                        // 思考区
  recent:    [{ animation: "excited", duration: 2500 }, { animation: "happy", duration: 2500 }],// 近期
  timeline:  [{ animation: "walk", duration: 5000 }],                                         // 生长
  map:       [{ animation: "happy", duration: 2500 }, { animation: "excited", duration: 2500 }],// 足迹
  guestbook: [{ animation: "robot", duration: 5000 }],                                        // 留言
  footer:    [],                                                                              // 页尾：跳过签名，直接 sleep
};

// Pool of animations randomly chosen for post-sleep "wake up" moments
export const RANDOM_WAKE_POOL: Animation[] = ["wave", "happy", "freeze", "bored"];

export function avatarReducer(
  state: AvatarStateData,
  action: AvatarAction
): AvatarStateData {
  switch (action.type) {
    case "MOUSE_MOVE": {
      const facingLeft = action.x < state.posX;
      // Always switch to walk — mouse motion cancels wave/dance/anything else.
      // We KEEP activeZone so when mouse stops we can return to the zone animation.
      return {
        ...state,
        animation: "walk",
        targetX: action.x,
        targetY: action.y,
        facingLeft,
      };
    }

    case "TICK": {
      // Always lerp position toward target (allows following mouse while in any zone)
      if (state.animation === "wave") return state;

      const dx = state.targetX - state.posX;
      const dy = state.targetY - state.posY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= CLOSE_ENOUGH) {
        // Close enough, don't move
        return state;
      }

      return {
        ...state,
        posX: state.posX + (dx / dist) * SPEED,
        posY: state.posY + (dy / dist) * SPEED,
      };
    }

    case "SET_POS":
      return {
        ...state,
        posX: action.x,
        posY: action.y,
        targetX: action.x,
        targetY: action.y,
      };

    case "SET_ANIM":
      return { ...state, animation: action.animation };

    case "IDLE_TIMEOUT":
      if (state.animation === "wave") return state;
      return { ...state, animation: "idle" };

    case "SIT_TIMEOUT":
      if (state.animation !== "idle") return state;
      return { ...state, animation: "sit" };

    case "SLEEP_TIMEOUT":
      if (state.animation !== "sit" && state.animation !== "idle") return state;
      return { ...state, animation: "sleep" };

    case "CLICK":
      if (state.animation === "wave") return state;
      return { ...state, animation: "wave" };

    case "WAVE_DONE":
      return { ...state, animation: "idle" };

    case "ZONE_ENTER": {
      // Just track the active zone; the hook drives the animation sequence via SET_ANIM
      return { ...state, activeZone: action.zone };
    }

    case "ZONE_EXIT":
      return { ...state, activeZone: null };

    // Walk toward a "dock" position (used before sleeping — see dockThenSleep
    // in the hook below) — same mechanics as MOUSE_MOVE, just driven by code
    // instead of the cursor.
    case "DOCK": {
      const facingLeft = action.x < state.posX;
      return {
        ...state,
        animation: "walk",
        targetX: action.x,
        targetY: action.y,
        facingLeft,
      };
    }

    default:
      return state;
  }
}

// --- React hook (uses reducer + DOM side effects) ---

// Where the avatar should walk to before it's allowed to fall asleep —
// bottom-right corner of the viewport, kept outside the centered 720px
// reading column so it never naps on top of the article text. On viewports
// too narrow to have room beside the column (~mobile-ish widths), fall back
// to the literal corner — those widths already hide the avatar entirely via
// the isMobile check in Avatar3D, so this is just a defensive fallback.
function getDockPosition(): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const roomRight = vw / 2 - 360; // px of space to the right of the 720px column
  const x = roomRight > 100 ? vw - 70 : vw - 40;
  const y = vh - 90;
  return { x, y };
}

interface UseAvatarStateOptions {
  onChatOpen: () => void;
  chatOpen: boolean;
  enabled: boolean;
}

export interface AvatarStateResult {
  animation: Animation;
  posX: number;
  posY: number;
  facingLeft: boolean;
  // True when the avatar's current horizontal position overlaps the centered
  // 720px reading column — consumer should dim the avatar so it doesn't
  // obscure the text underneath.
  dimmed: boolean;
  onAvatarClick: () => void;
}

export function useAvatarState({
  onChatOpen,
  chatOpen,
  enabled,
}: UseAvatarStateOptions): AvatarStateResult {
  const [state, dispatch] = useReducer(avatarReducer, undefined, initialState);
  const [mounted, setMounted] = useState(false);
  // All timers tracked in a single ref so both mouse and zone effects can coordinate
  const timersRef = useRef({
    idle: null as ReturnType<typeof setTimeout> | null,
    sit: null as ReturnType<typeof setTimeout> | null,
    sleep: null as ReturnType<typeof setTimeout> | null,
    wave: null as ReturnType<typeof setTimeout> | null,
    zoneHold: null as ReturnType<typeof setTimeout> | null,
    jump: null as ReturnType<typeof setTimeout> | null,
    chat: null as ReturnType<typeof setTimeout> | null,
    dockCheck: null as ReturnType<typeof setTimeout> | null,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  // Bumped every time a dock-then-sleep attempt is interrupted (mouse move,
  // scroll, zone change) so an in-flight poll knows to abandon itself instead
  // of dozing off at a stale target.
  const dockTokenRef = useRef(0);
  // Forward reference so dockThenSleep (declared before scheduleRandomWake)
  // can still call the latest scheduleRandomWake once it's defined.
  const scheduleRandomWakeRef = useRef<() => void>(() => {});

  // ---- Shared helpers ----
  const clearAllIdleTimers = useCallback(() => {
    const t = timersRef.current;
    if (t.idle) { clearTimeout(t.idle); t.idle = null; }
    if (t.sit) { clearTimeout(t.sit); t.sit = null; }
    if (t.sleep) { clearTimeout(t.sleep); t.sleep = null; }
    if (t.wave) { clearTimeout(t.wave); t.wave = null; }
    if (t.zoneHold) { clearTimeout(t.zoneHold); t.zoneHold = null; }
    if (t.dockCheck) { clearTimeout(t.dockCheck); t.dockCheck = null; }
    dockTokenRef.current++; // invalidate any in-flight dock-then-sleep attempt
  }, []);

  // Walk the avatar to the dock position, then fall asleep once it arrives
  // (or after a generous timeout, so a stuck poll can't hang forever). This
  // is the single place sleep gets triggered from — never dispatch "sleep"
  // directly, or the avatar can nap on top of the article text.
  const dockThenSleep = useCallback(() => {
    if (typeof window === "undefined") return;
    const token = ++dockTokenRef.current;
    const { x, y } = getDockPosition();
    dispatch({ type: "DOCK", x, y });

    const t = timersRef.current;
    const startedAt = Date.now();
    const poll = () => {
      if (dockTokenRef.current !== token) return; // interrupted — abandon
      const s = stateRef.current;
      const dx = x - s.posX;
      const dy = y - s.posY;
      const arrived = Math.sqrt(dx * dx + dy * dy) <= CLOSE_ENOUGH;
      if (arrived || Date.now() - startedAt > 6000) {
        dispatch({ type: "SET_ANIM", animation: "sleep" });
        scheduleRandomWakeRef.current();
        return;
      }
      t.dockCheck = setTimeout(poll, 100);
    };
    poll();
  }, []);

  // After sleep, periodically wake up with a random animation, then return to sleep
  const scheduleRandomWake = useCallback(() => {
    const t = timersRef.current;
    t.wave = setTimeout(() => {
      const pick = RANDOM_WAKE_POOL[Math.floor(Math.random() * RANDOM_WAKE_POOL.length)];
      dispatch({ type: "SET_ANIM", animation: pick });
      setTimeout(() => {
        dockThenSleep();
      }, 2000);
    }, 10000 + Math.random() * 5000); // 10-15s
  }, [dockThenSleep]);
  scheduleRandomWakeRef.current = scheduleRandomWake;

  // Idle → sit → sleep (via dock) → random wake
  const startIdleChain = useCallback(() => {
    const t = timersRef.current;
    clearAllIdleTimers();
    dispatch({ type: "SET_ANIM", animation: "idle" });
    t.sit = setTimeout(() => {
      dispatch({ type: "SET_ANIM", animation: "sit" });
      t.sleep = setTimeout(() => {
        dockThenSleep();
      }, 2000);
    }, 2000);
  }, [clearAllIdleTimers, dockThenSleep]);

  // Play a zone's signature sequence, then start idle chain
  const playZoneSequence = useCallback((zone: Exclude<Zone, null>) => {
    const sequence = ZONE_SEQUENCE[zone] || [];
    const t = timersRef.current;

    // Footer: skip signature, go direct to sleep (still docks first)
    if (sequence.length === 0) {
      dockThenSleep();
      return;
    }

    // Play sequence step by step
    const playStep = (stepIdx: number) => {
      if (stepIdx >= sequence.length) {
        startIdleChain();
        return;
      }
      const step = sequence[stepIdx];
      dispatch({ type: "SET_ANIM", animation: step.animation });
      if (t.zoneHold) clearTimeout(t.zoneHold);
      t.zoneHold = setTimeout(() => playStep(stepIdx + 1), step.duration);
    };
    playStep(0);
  }, [startIdleChain, dockThenSleep]);

  // Initialize position
  useEffect(() => {
    setMounted(true);
    const startX = window.innerWidth - 120;
    const startY = window.innerHeight - 120;
    dispatch({ type: "SET_POS", x: startX, y: startY });
    dispatch({ type: "IDLE_TIMEOUT" });
  }, []);

  // Shared "go back to idle/zone-sequence after 2s of stillness" scheduler —
  // used by both mouse move and scroll wake-ups below.
  const scheduleIdleResume = useCallback(() => {
    const t = timersRef.current;
    t.idle = setTimeout(() => {
      const z = stateRef.current.activeZone;
      if (z) {
        playZoneSequence(z);
      } else {
        startIdleChain();
      }
    }, 2000);
  }, [playZoneSequence, startIdleChain]);

  // Mouse tracking
  useEffect(() => {
    if (!mounted || !enabled) return;

    function onMouseMove(e: MouseEvent) {
      dispatch({ type: "MOUSE_MOVE", x: e.clientX - 32, y: e.clientY - 32 });

      // Cancel any pending chat (mouse move cancels click→wave→chat)
      if (timersRef.current.chat) {
        clearTimeout(timersRef.current.chat);
        timersRef.current.chat = null;
      }

      clearAllIdleTimers();
      scheduleIdleResume();
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      clearAllIdleTimers();
    };
  }, [mounted, enabled, clearAllIdleTimers, scheduleIdleResume]);

  // Scroll wakes the avatar immediately too — a sleeping/sitting avatar
  // shouldn't stay dozed off just because the mouse didn't move while the
  // visitor scrolled past it.
  useEffect(() => {
    if (!mounted || !enabled) return;

    function onScroll() {
      clearAllIdleTimers();
      if (stateRef.current.animation !== "wave") {
        dispatch({ type: "SET_ANIM", animation: "idle" });
      }
      scheduleIdleResume();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted, enabled, clearAllIdleTimers, scheduleIdleResume]);

  // Animation loop for movement
  useEffect(() => {
    if (!mounted || !enabled) return;

    let animId: number;
    let lastTime = 0;

    function tick(timestamp: number) {
      animId = requestAnimationFrame(tick);
      if (timestamp - lastTime < 50) return; // ~20fps for position updates
      lastTime = timestamp;
      dispatch({ type: "TICK" });
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [mounted, enabled]);

  // Zone detection via IntersectionObserver
  useEffect(() => {
    if (!mounted) return;

    const zones: { id: string; zone: Exclude<Zone, null> }[] = [
      { id: "hero", zone: "hero" },
      { id: "works", zone: "works" },
      { id: "beliefs", zone: "beliefs" },
      { id: "mind", zone: "mind" },
      { id: "recent", zone: "recent" },
      { id: "timeline", zone: "timeline" },
      { id: "map", zone: "map" },
      { id: "guestbook", zone: "guestbook" },
    ];

    const observers: IntersectionObserver[] = [];

    function enterZone(zone: Exclude<Zone, null>) {
      const prev = stateRef.current.activeZone;
      if (prev === zone) return;
      clearAllIdleTimers();
      dispatch({ type: "ZONE_ENTER", zone });
      // Jump transition only when switching from one zone to another
      if (prev !== null) {
        dispatch({ type: "SET_ANIM", animation: "jump" });
        if (timersRef.current.jump) clearTimeout(timersRef.current.jump);
        timersRef.current.jump = setTimeout(() => {
          playZoneSequence(zone);
        }, 900);
      } else {
        playZoneSequence(zone);
      }
    }

    // Observe named sections
    for (const { id, zone } of zones) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            enterZone(zone);
          } else if (stateRef.current.activeZone === zone) {
            dispatch({ type: "ZONE_EXIT" });
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    }

    // Footer zone
    const footer = document.querySelector("footer");
    if (footer) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            enterZone("footer");
          } else if (stateRef.current.activeZone === "footer") {
            dispatch({ type: "ZONE_EXIT" });
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(footer);
      observers.push(obs);
    }

    return () => {
      observers.forEach((obs) => obs.disconnect());
      if (timersRef.current.jump) {
        clearTimeout(timersRef.current.jump);
        timersRef.current.jump = null;
      }
    };
  }, [mounted, clearAllIdleTimers, playZoneSequence]);

  // Click handler — interrupts everything and opens chat immediately
  const onAvatarClick = useCallback(() => {
    clearAllIdleTimers();
    if (timersRef.current.chat) clearTimeout(timersRef.current.chat);
    if (timersRef.current.jump) { clearTimeout(timersRef.current.jump); timersRef.current.jump = null; }
    onChatOpen();
  }, [onChatOpen, clearAllIdleTimers]);

  // Dim the avatar whenever it's currently overlapping the centered 720px
  // reading column, so it doesn't visually block the text underneath.
  const [dimmed, setDimmed] = useState(false);
  useEffect(() => {
    if (!mounted) return;
    function check() {
      const vw = window.innerWidth;
      const buffer = 40; // rough half-width of the avatar sprite
      const left = vw / 2 - 360 - buffer;
      const right = vw / 2 + 360 + buffer;
      setDimmed(state.posX > left && state.posX < right);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [mounted, state.posX]);

  return {
    animation: state.animation,
    posX: state.posX,
    posY: state.posY,
    facingLeft: state.facingLeft,
    dimmed,
    onAvatarClick,
  };
}
