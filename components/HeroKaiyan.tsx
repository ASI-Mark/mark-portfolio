"use client";

import { useEffect, useRef } from "react";
import { buildEyelidClipPaths } from "@/lib/kaiyanEyelids";

interface HeroKaiyanProps {
  /**
   * Fired the instant the eyelids finish closing (screen fully black) at the
   * end of Act One. The parent (ActGate) unmounts this component in response
   * and hands the eyelid-OPEN half of the animation to its own short-lived
   * transition layer — see lib/kaiyanEyelids.ts for why the two halves share
   * geometry.
   */
  onDone: () => void;
}

// ---- Types for the mutable state that lives inside the effect ----

interface Hand {
  id: string;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  cells: number[];
  disintegrated: boolean;
  progress: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  flick: number;
}

interface Ash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  color: string;
}

interface PhraseSpan {
  el: HTMLSpanElement;
  idx: number;
  baseX: number;
  baseY: number;
  phase: number;
  amp: number;
  speed: number;
  rot: number;
  // 手写题记的"不齐"：每字稳定的字号/位移/旋转/墨色抖动
  jScale: number;
  jDx: number;
  jDy: number;
  jRot: number;
  jInk: number;
}

const MEMORY_PHRASES = [
  "贩卖信息是贬值资产，贩卖视角是升值资产",
  "框架是梯子，不是牢笼",
  "没有一个好的钉子，就不要买无数把锤子",
  "AI 时代最重要的是扎好马步",
  "用复盘和记录对抗遗忘",
  "人会消失，字不会",
  "我缺的不是技能，是让独特性被看见的放大器",
  "这不是我的简历，是我的思考操作系统",
  "逻辑、思辨、提问、判断",
  "营销、审美、决策判断，不可替代",
  "2,338 篇笔记，308 层目录",
  "一个月，抖音 0 → 2 万粉",
  "建造者的证据",
  "止损也是能力",
  "长期资产，活着的数字自我",
];

const CHAIN_PHRASE = "人不能活一辈子最后只有两个字严父或者慈母";
const PHRASE_OLD = CHAIN_PHRASE.split("");
const PHRASE_NEW = "你想要怎样活这一生？".split("");

const IMG_W = 1024;
const IMG_H = 1536;
const GRID_W = 32;
const GRID_H = 48;

const HAND_SEED: Omit<Hand, "cells" | "disintegrated" | "progress">[] = [
  { id: "greed", label: "贪", cx: 0.29, cy: 0.685, rx: 0.2, ry: 0.14 },
  { id: "wrath", label: "嗔", cx: 0.685, cy: 0.685, rx: 0.19, ry: 0.14 },
  { id: "delusion", label: "痴", cx: 0.4, cy: 0.36, rx: 0.19, ry: 0.15 },
  { id: "pride", label: "慢", cx: 0.53, cy: 0.16, rx: 0.15, ry: 0.14 },
  { id: "doubt", label: "疑", cx: 0.79, cy: 0.47, rx: 0.18, ry: 0.15 },
];

export default function HeroKaiyan({ onDone }: HeroKaiyanProps) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageWarmthRef = useRef<HTMLDivElement>(null);
  const textureLayerRef = useRef<HTMLDivElement>(null);
  const textureBaseRef = useRef<HTMLDivElement>(null);
  const textureRealRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const heartStageRef = useRef<HTMLDivElement>(null);
  const heartWrapRef = useRef<HTMLDivElement>(null);
  const healedImgRef = useRef<HTMLImageElement>(null);
  const corruptCanvasRef = useRef<HTMLCanvasElement>(null);
  const beatLayerRef = useRef<HTMLDivElement>(null);
  const bigQuestionRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const wingLRef = useRef<HTMLCanvasElement>(null);
  const wingRRef = useRef<HTMLCanvasElement>(null);
  const corruptCanvasBeatRef = useRef<HTMLCanvasElement>(null);
  const phraseLayerRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const fireCursorRef = useRef<HTMLDivElement>(null);
  const flameOuterRef = useRef<HTMLDivElement>(null);
  const flameCoreRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLDivElement>(null);
  const eyelidTopRef = useRef<HTMLDivElement>(null);
  const eyelidBottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelToggleRef = useRef<HTMLButtonElement>(null);
  const corruptedSrcImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stageWarmthEl = stageWarmthRef.current;
    const textureLayerEl = textureLayerRef.current;
    const textureBaseEl = textureBaseRef.current;
    const textureRealEl = textureRealRef.current;
    const sceneEl = sceneRef.current;
    const heartStageEl = heartStageRef.current;
    const heartWrapEl = heartWrapRef.current;
    const corruptCanvas = corruptCanvasRef.current;
    const beatLayerEl = beatLayerRef.current;
    const corruptCanvasBeat = corruptCanvasBeatRef.current;
    const phraseLayerEl = phraseLayerRef.current;
    const sealEl = sealRef.current;
    const veilEl = veilRef.current;
    const fxCanvas = fxCanvasRef.current;
    const fireCursorEl = fireCursorRef.current;
    const flameOuterEl = flameOuterRef.current;
    const flameCoreEl = flameCoreRef.current;
    const hintEl = hintRef.current;
    const skipLinkEl = skipLinkRef.current;
    const eyelidTop = eyelidTopRef.current;
    const eyelidBottom = eyelidBottomRef.current;
    const panel = panelRef.current;
    const panelToggleBtn = panelToggleRef.current;
    const corruptedSrcImg = corruptedSrcImgRef.current;

    if (
      !root || !stageWarmthEl || !textureLayerEl || !textureBaseEl || !textureRealEl ||
      !sceneEl || !heartStageEl || !heartWrapEl || !corruptCanvas || !beatLayerEl ||
      !corruptCanvasBeat || !phraseLayerEl || !veilEl || !fxCanvas || !fireCursorEl ||
      !flameOuterEl || !flameCoreEl || !hintEl || !skipLinkEl || !eyelidTop ||
      !eyelidBottom || !panel || !panelToggleBtn || !corruptedSrcImg
    ) {
      return;
    }

    // ---- alive flag + timer bookkeeping so every deferred callback is a
    // no-op once the component unmounts (e.g. replay remounts a fresh
    // instance mid-animation) ----
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function setT(fn: () => void, ms: number) {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
      return id;
    }
    function clearT(id: ReturnType<typeof setTimeout> | null) {
      if (id != null) {
        clearTimeout(id);
        timers.delete(id);
      }
    }

    const PARAMS = {
      brushRadius: 60,
      sparkDensity: 1,
      ashCount: 110,
      restBpm: 48,
      veilStrength: 0.08,
      textureOpacityMax: 0.18,
      healThresholdPct: 92,
      handThresholdPct: 60,
      restBpmBonusPerHand: 6,
      idleSampleMs: 500,
      parallaxStrength: 1,
      wingAmp: 1,
    };

    let parX = 0;
    let parY = 0;

    const REDUCED_MOTION =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = corruptCanvas.getContext("2d", { willReadFrequently: true });
    const beatCtx = corruptCanvasBeat.getContext("2d");
    if (!ctx || !beatCtx) return;

    // ---- 翅膀扇动：复合画面(当前屏幕态) → 各翼遮罩片 → 翅根为轴摆动 ----
    const wingL = wingLRef.current;
    const wingR = wingRRef.current;
    const wingLCtx = wingL?.getContext("2d") ?? null;
    const wingRCtx = wingR?.getContext("2d") ?? null;
    const wingsOn = !REDUCED_MOTION && !!(wingL && wingR && wingLCtx && wingRCtx);

    // 一次性构建左右翼软边遮罩（椭圆近似，参照 heart-corrupted.jpg 目测）
    function buildWingMask(side: "L" | "R"): HTMLCanvasElement {
      const m = document.createElement("canvas");
      m.width = IMG_W;
      m.height = IMG_H;
      const mc = m.getContext("2d")!;
      mc.fillStyle = "#000";
      mc.filter = "blur(34px)";
      // 归一化椭圆（避开中央 0.36~0.66 的心脏/手区）
      const ells =
        side === "L"
          ? [
              [0.22, 0.34, 0.2, 0.2],
              [0.19, 0.52, 0.22, 0.26],
              [0.25, 0.66, 0.16, 0.16],
            ]
          : [
              [0.78, 0.34, 0.2, 0.2],
              [0.81, 0.52, 0.22, 0.26],
              [0.75, 0.66, 0.16, 0.16],
            ];
      ells.forEach(([cx, cy, rx, ry]) => {
        mc.beginPath();
        mc.ellipse(cx * IMG_W, cy * IMG_H, rx * IMG_W, ry * IMG_H, 0, 0, Math.PI * 2);
        mc.fill();
      });
      return m;
    }
    const wingMaskL = wingsOn ? buildWingMask("L") : null;
    const wingMaskR = wingsOn ? buildWingMask("R") : null;
    // 复合缓冲：屏幕当前态 = healed 垫底 + corrupt 覆盖（corrupt 擦除处透出 healed）
    const compCanvas = document.createElement("canvas");
    compCanvas.width = IMG_W;
    compCanvas.height = IMG_H;
    const compCtx = compCanvas.getContext("2d");

    function rebuildWings() {
      if (!wingsOn || !compCtx) return;
      const healedEl = healedImgRef.current;
      if (!healedEl || !healedEl.naturalWidth) return;
      compCtx.globalCompositeOperation = "source-over";
      compCtx.clearRect(0, 0, IMG_W, IMG_H);
      compCtx.drawImage(healedEl, 0, 0, IMG_W, IMG_H);
      compCtx.drawImage(corruptCanvas!, 0, 0);
      for (const [wc, mask] of [
        [wingLCtx!, wingMaskL!],
        [wingRCtx!, wingMaskR!],
      ] as const) {
        wc.globalCompositeOperation = "source-over";
        wc.clearRect(0, 0, IMG_W, IMG_H);
        wc.drawImage(compCanvas, 0, 0);
        wc.globalCompositeOperation = "destination-in";
        wc.drawImage(mask, 0, 0);
        wc.globalCompositeOperation = "source-over";
      }
    }

    let beatDirty = true;
    let finaleFullBeat = false;
    function syncBeatCanvas() {
      // 挣脱感的关键：黑壳与手是"死"的（永不搏动），搏动层只画
      // 「治愈图 ∩ 已擦除区域」——被火种照活的血肉在钳制下跳动，
      // 擦得越多，活的部分越大，直到终幕整颗心自由搏动。
      const healedEl = healedImgRef.current;
      if (!healedEl || !healedEl.naturalWidth) return;
      beatCtx!.clearRect(0, 0, corruptCanvasBeat!.width, corruptCanvasBeat!.height);
      beatCtx!.drawImage(healedEl, 0, 0, corruptCanvasBeat!.width, corruptCanvasBeat!.height);
      if (!finaleFullBeat) {
        beatCtx!.globalCompositeOperation = "destination-out";
        beatCtx!.drawImage(corruptCanvas!, 0, 0);
        beatCtx!.globalCompositeOperation = "source-over";
      }
      beatDirty = false;
    }
    function setBeatTransform(str: string, transition?: string) {
      beatLayerEl!.style.transition = transition === undefined ? "" : transition;
      beatLayerEl!.style.transform = str;
    }
    if (REDUCED_MOTION) beatLayerEl.style.display = "none";

    // ============================================================
    // Memory texture (dimmed background phrases)
    // ============================================================
    function boxesOverlap(
      a: { left: number; top: number; right: number; bottom: number },
      b: { left: number; top: number; right: number; bottom: number },
      gap: number
    ) {
      return (
        a.left < b.right + gap &&
        a.right > b.left - gap &&
        a.top < b.bottom + gap &&
        a.bottom > b.top - gap
      );
    }

    function buildTexture() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const GAP = 14;
      const MAX_TRIES = 60;
      const heartR = heartStageEl!.getBoundingClientRect();
      const heartZone = {
        left: heartR.left - heartR.width * 0.35,
        top: heartR.top - heartR.height * 0.15,
        right: heartR.right + heartR.width * 0.35,
        bottom: heartR.bottom + heartR.height * 0.15,
      };

      textureBaseEl!.innerHTML = "";
      textureRealEl!.innerHTML = "";

      const placed: { left: number; top: number; right: number; bottom: number }[] = [];

      for (let i = 0; i < MEMORY_PHRASES.length; i++) {
        const text = MEMORY_PHRASES[i];
        const size = 11 + Math.random() * 3;
        const rotDeg = Math.random() * 4 - 2;

        const base = document.createElement("div");
        base.className = "ky-memory-phrase";
        base.style.cssText = `left:0;top:0;visibility:hidden;font-size:${size.toFixed(1)}px;`;
        base.textContent = text;
        textureBaseEl!.appendChild(base);
        const mw = base.offsetWidth;
        const mh = base.offsetHeight;

        const rad = (Math.abs(rotDeg) * Math.PI) / 180;
        const ebw = mw * Math.cos(rad) + mh * Math.sin(rad);
        const ebh = mw * Math.sin(rad) + mh * Math.cos(rad);

        let box: { left: number; top: number; right: number; bottom: number } | null = null;
        for (let tries = 0; tries < MAX_TRIES; tries++) {
          const left = 4 + Math.random() * Math.max(1, w - ebw - 8);
          const top = 4 + Math.random() * Math.max(1, h - ebh - 8);
          const cand = { left, top, right: left + ebw, bottom: top + ebh };
          if (boxesOverlap(cand, heartZone, 0)) continue;
          let collided = false;
          for (let p = 0; p < placed.length; p++) {
            if (boxesOverlap(cand, placed[p], GAP)) {
              collided = true;
              break;
            }
          }
          if (!collided) {
            box = cand;
            break;
          }
        }
        if (!box) {
          textureBaseEl!.removeChild(base);
          continue;
        }

        placed.push(box);

        const elLeft = box.left + (ebw - mw) / 2;
        const elTop = box.top + (ebh - mh) / 2;
        const styleStr =
          `left:${elLeft.toFixed(1)}px;top:${elTop.toFixed(1)}px;` +
          `transform:rotate(${rotDeg.toFixed(2)}deg);font-size:${size.toFixed(1)}px;`;

        base.style.cssText = styleStr;

        const real = document.createElement("div");
        real.className = "ky-memory-phrase";
        real.style.cssText = styleStr;
        real.textContent = text;
        textureRealEl!.appendChild(real);
      }
    }

    // ============================================================
    // Five hands (normalized hotspots) + progress grid maps
    // ============================================================
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = GRID_W;
    sampleCanvas.height = GRID_H;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true })!;

    const origCanvas = document.createElement("canvas");
    origCanvas.width = IMG_W;
    origCanvas.height = IMG_H;
    const origCtx = origCanvas.getContext("2d", { willReadFrequently: true })!;

    const HANDS: Hand[] = HAND_SEED.map((h) => ({ ...h, cells: [], disintegrated: false, progress: 0 }));

    function buildHandCellMaps() {
      HANDS.forEach((hand) => {
        hand.cells = [];
        for (let gy = 0; gy < GRID_H; gy++) {
          for (let gx = 0; gx < GRID_W; gx++) {
            const nx = (gx + 0.5) / GRID_W;
            const ny = (gy + 0.5) / GRID_H;
            const dx = (nx - hand.cx) / hand.rx;
            const dy = (ny - hand.cy) / hand.ry;
            if (dx * dx + dy * dy <= 1) {
              hand.cells.push(gy * GRID_W + gx);
            }
          }
        }
        hand.disintegrated = false;
        hand.progress = 0;
      });
    }
    buildHandCellMaps();

    let disintegratedCount = 0;
    let overallErasedFraction = 0;

    // ============================================================
    // Scratch-card healing — canvas destination-out soft brush erase
    // ============================================================
    function stampBrush(cx: number, cy: number, r: number) {
      beatDirty = true;
      ctx!.save();
      ctx!.globalCompositeOperation = "destination-out";
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.65, "rgba(0,0,0,0.95)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    function eraseSegment(x0: number, y0: number, x1: number, y1: number, r: number) {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const step = Math.max(4, r * 0.25);
      const n = Math.max(1, Math.ceil(dist / step));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        stampBrush(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r);
      }
    }

    function handBBoxCanvas(hand: Hand) {
      const x0 = Math.max(0, Math.round((hand.cx - hand.rx) * IMG_W));
      const y0 = Math.max(0, Math.round((hand.cy - hand.ry) * IMG_H));
      const x1 = Math.min(IMG_W, Math.round((hand.cx + hand.rx) * IMG_W));
      const y1 = Math.min(IMG_H, Math.round((hand.cy + hand.ry) * IMG_H));
      return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
    }

    function bigEraseHandRegion(hand: Hand) {
      const cx = hand.cx * IMG_W;
      const cy = hand.cy * IMG_H;
      const rPx = ((hand.rx * IMG_W + hand.ry * IMG_H) / 2) * 1.3;
      stampBrush(cx, cy, rPx);
      const ring = 6;
      for (let i = 0; i < ring; i++) {
        const ang = (i / ring) * Math.PI * 2;
        stampBrush(cx + Math.cos(ang) * rPx * 0.55, cy + Math.sin(ang) * rPx * 0.7, rPx * 0.75);
      }
    }

    // ============================================================
    // Sparks / ash particles
    // ============================================================
    const fxCtx = fxCanvas.getContext("2d")!;
    let sparks: Spark[] = [];
    let ashParticles: Ash[] = [];

    function resizeFxCanvas() {
      fxCanvas!.width = window.innerWidth;
      fxCanvas!.height = window.innerHeight;
    }

    function spawnSparks(x: number, y: number, vxBack: number, vyBack: number) {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        if (sparks.length >= 20) break;
        const spread = (Math.random() - 0.5) * 1.2;
        const speed = 20 + Math.random() * 40;
        const ang = Math.atan2(vyBack, vxBack) + spread;
        const life = 400 + Math.random() * 380;
        sparks.push({
          x,
          y,
          vx: Math.cos(ang) * speed * 0.4,
          vy: Math.sin(ang) * speed * 0.4 - 18 - Math.random() * 20,
          size: 1.5 + Math.random() * 1.5,
          life,
          maxLife: life,
          flick: Math.random(),
        });
      }
    }

    function updateSparks(dtSec: number) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= 0.94;
        s.vy = s.vy * 0.94 - 40 * dtSec;
        s.x += s.vx * dtSec;
        s.y += s.vy * dtSec;
        s.life -= dtSec * 1000;
        if (s.life <= 0) sparks.splice(i, 1);
      }
    }

    function triggerHandDisintegrate(hand: Hand) {
      if (hand.disintegrated) return;
      hand.disintegrated = true;
      disintegratedCount++;

      const bbox = handBBoxCanvas(hand);
      let imgData: Uint8ClampedArray | null = null;
      try {
        imgData = origCtx.getImageData(bbox.x, bbox.y, bbox.w, bbox.h).data;
      } catch {
        imgData = null;
      }

      const rect = corruptCanvas!.getBoundingClientRect();
      const k = rect.width > 0 ? rect.width / IMG_W : 0.5;
      const handCenterView = {
        x: rect.left + hand.cx * IMG_W * k,
        y: rect.top + hand.cy * IMG_H * k,
      };

      let windDx = handCenterView.x - fireX;
      let windDy = handCenterView.y - fireY;
      const windLen = Math.hypot(windDx, windDy) || 1;
      windDx /= windLen;
      windDy /= windLen;

      const count = Math.round(PARAMS.ashCount * (0.85 + Math.random() * 0.3));
      for (let i = 0; i < count; i++) {
        let r = 26;
        let g = 26;
        let b = 26;
        if (imgData && imgData.length >= 4) {
          const pxCount = bbox.w * bbox.h;
          const idx = Math.floor(Math.random() * pxCount) * 4;
          if (imgData[idx + 3] > 10) {
            r = imgData[idx];
            g = imgData[idx + 1];
            b = imgData[idx + 2];
          }
        }
        const spreadAngle = (Math.random() - 0.5) * 1.3;
        const baseAngle = Math.atan2(windDy, windDx) + spreadAngle;
        const speed = 30 + Math.random() * 90;
        const life = 550 + Math.random() * 280;
        ashParticles.push({
          x: handCenterView.x + (Math.random() - 0.5) * bbox.w * k * 0.7,
          y: handCenterView.y + (Math.random() - 0.5) * bbox.h * k * 0.7,
          vx: Math.cos(baseAngle) * speed,
          vy: Math.sin(baseAngle) * speed - 25 - Math.random() * 35,
          size: 2 + Math.random() * 4,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 6,
          life,
          maxLife: life,
          color: `rgb(${r},${g},${b})`,
        });
      }

      bigEraseHandRegion(hand);

      if (!REDUCED_MOTION) {
        pulseHeartbeatBump();
      }
    }

    function updateAsh(dtSec: number) {
      for (let i = ashParticles.length - 1; i >= 0; i--) {
        const a = ashParticles[i];
        a.vx *= 0.97;
        a.vy = a.vy * 0.97 - 15 * dtSec;
        a.vx += (Math.random() - 0.5) * 8 * dtSec;
        a.vy += (Math.random() - 0.5) * 8 * dtSec;
        a.x += a.vx * dtSec;
        a.y += a.vy * dtSec;
        a.rot += a.rotSpeed * dtSec;
        a.life -= dtSec * 1000;
        if (a.life <= 0) ashParticles.splice(i, 1);
      }
    }

    function renderFx() {
      fxCtx.clearRect(0, 0, fxCanvas!.width, fxCanvas!.height);

      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        const lifeFrac = Math.max(0, s.life / s.maxLife);
        const flicker = 0.6 + 0.4 * Math.sin(performance.now() / 60 + s.flick * 10);
        fxCtx.globalAlpha = Math.max(0, lifeFrac * flicker);
        const mix = lifeFrac;
        fxCtx.fillStyle = mix > 0.5 ? "#E8C97D" : "#8B2E2E";
        fxCtx.beginPath();
        fxCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        fxCtx.fill();
      }

      for (let j = 0; j < ashParticles.length; j++) {
        const a = ashParticles[j];
        const lifeFrac = Math.max(0, a.life / a.maxLife);
        fxCtx.save();
        fxCtx.globalAlpha = lifeFrac;
        fxCtx.translate(a.x, a.y);
        fxCtx.rotate(a.rot);
        const sz = a.size * (0.4 + lifeFrac * 0.6);
        fxCtx.fillStyle = a.color;
        fxCtx.fillRect(-sz / 2, -sz / 2, sz, sz);
        fxCtx.restore();
      }
      fxCtx.globalAlpha = 1;
    }

    // ============================================================
    // Floating phrase cloud
    // ============================================================
    let phraseSpans: PhraseSpan[] = [];

    function buildPhraseCloud() {
      phraseLayerEl!.innerHTML = "";
      phraseSpans = [];
      for (let i = 0; i < PHRASE_OLD.length; i++) {
        const span = document.createElement("span");
        span.className = "ky-phrase-ch";
        span.textContent = PHRASE_OLD[i];
        phraseLayerEl!.appendChild(span);
        phraseSpans.push({
          el: span,
          idx: i,
          baseX: 0,
          baseY: 0,
          phase: Math.random() * Math.PI * 2,
          amp: 6 + Math.random() * 4,
          speed: 0.0012 + Math.random() * 0.0009,
          rot: 0,
          jScale: 0.93 + Math.random() * 0.14, // 字号 ±7%
          jDx: (Math.random() - 0.5) * 3, // 水平 ±1.5px
          jDy: (Math.random() - 0.5) * 2, // 基线 ±1px
          jRot: (Math.random() - 0.5) * 3.2, // 字身 ±1.6°
          jInk: 0.78 + Math.random() * 0.17, // 墨色浓淡
        });
      }
    }

    function layoutPhraseCloud() {
      // 古图谱批注体：句子竖排两列写在画面顶部两角的羊皮纸上（先右后左，
      // 古籍读序），multiply 融进纸面——文字属于画，不浮在画上。
      const r = heartStageEl!.getBoundingClientRect();
      const fontPx = Math.max(12, Math.min(22, r.width * 0.038));
      const stepY = fontPx * 1.28;
      const colGap = fontPx * 1.6;
      const topY = r.top + r.height * 0.035;
      // 每边两短列（5 字/列），古籍题跋式，全部落在顶部亮纸区；
      // 右侧先读且列序右→左（古序），左侧续读同理
      const rightOuterX = r.left + r.width * 0.925 - fontPx / 2;
      const leftOuterX = r.left + r.width * 0.075 - fontPx / 2;

      phraseSpans.forEach((p) => {
        const side = p.idx < 10 ? "R" : "L";
        const local = p.idx % 10;
        const col = Math.floor(local / 5); // 0=先读列, 1=后读列
        const k = local % 5;
        const x =
          (side === "R" ? rightOuterX - col * colGap : leftOuterX + col * colGap) +
          p.jDx;
        const y = topY + k * stepY + p.jDy;
        p.rot = p.jRot;
        p.baseX = x;
        p.baseY = y;
        p.el.style.fontSize = (fontPx * p.jScale).toFixed(1) + "px";
        p.el.style.opacity = String(p.jInk);
        p.el.style.left = x.toFixed(1) + "px";
        p.el.style.top = y.toFixed(1) + "px";
      });

      // 落款朱砂印：左侧后读列末字下方
      if (sealEl) {
        const sealSize = fontPx * 1.55;
        const lastLocal = 4;
        const sealX = leftOuterX + 1 * colGap - sealSize * 0.15;
        const sealY = topY + lastLocal * stepY + stepY * 0.95;
        sealEl.style.width = sealSize.toFixed(1) + "px";
        sealEl.style.height = sealSize.toFixed(1) + "px";
        sealEl.style.fontSize = (sealSize * 0.62).toFixed(1) + "px";
        sealEl.style.left = sealX.toFixed(1) + "px";
        sealEl.style.top = sealY.toFixed(1) + "px";
      }
    }

    function updatePhraseFloat(ts: number) {
      // 批注是"写上去"的：只保留极轻微的纸面起伏（±1.2px）+ 每字固定微转
      for (let i = 0; i < phraseSpans.length; i++) {
        const p = phraseSpans[i];
        if (p.el.classList.contains("gone")) continue;
        const off = Math.sin(ts * p.speed + p.phase) * 1.2;
        p.el.style.transform = `translateY(${off.toFixed(1)}px) rotate(${p.jRot.toFixed(2)}deg)`;
      }
    }

    let morphed = false;
    function morphPhrase() {
      if (morphed) return;
      morphed = true;

      // 古批注（旧剧本）逐字烧退，随后活的问题以大字立在光里
      phraseSpans.forEach((p, i) => {
        setT(() => {
          p.el.classList.add("fading");
        }, i * 45);
      });

      // 印最后揭走：批注烧退后再隔 200ms
      setT(() => sealEl?.classList.add("ky-seal-gone"), phraseSpans.length * 45 + 200);

      const fadeOutMs = phraseSpans.length * 45 + 460;
      setT(() => {
        phraseSpans.forEach((p) => p.el.classList.add("gone"));
        bigQuestionRef.current?.classList.add("ky-show");
      }, fadeOutMs);
    }

    function resetPhraseCloud() {
      morphed = false;
      bigQuestionRef.current?.classList.remove("ky-show");
      sealEl?.classList.remove("ky-seal-gone");
      phraseSpans.forEach((p, i) => {
        p.el.textContent = PHRASE_OLD[i];
        p.el.classList.remove("fading");
        p.el.classList.remove("gone");
      });
    }

    // ============================================================
    // Heartbeat (lub-dub curve)
    // ============================================================
    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function heartScaleAt(phase: number, amp: number) {
      const mainAmp = 0.045 * amp;
      const secAmp = 0.022 * amp;
      if (phase < 120) {
        const p = phase / 120;
        return 1 + mainAmp * easeOut(p);
      } else if (phase < 400) {
        const p2 = (phase - 120) / 280;
        return 1 + mainAmp - mainAmp * easeOut(p2);
      } else if (phase < 460) {
        return 1;
      } else if (phase < 520) {
        const p3 = (phase - 460) / 60;
        return 1 + secAmp * easeOut(p3);
      } else if (phase < 660) {
        const p4 = (phase - 520) / 140;
        return 1 + secAmp - secAmp * easeOut(p4);
      }
      return 1;
    }

    let beatTime = 0;
    let lastTs: number | null = null;
    let pauseBeatUntil = 0;
    let bpmSmoothed = PARAMS.restBpm;
    let restBpmBonus = 0;
    let finaleFired = false;
    let actOneFinished = false;
    let blinkInProgress = false;

    function pulseHeartbeatBump() {
      restBpmBonus = Math.min(PARAMS.restBpmBonusPerHand * 5, restBpmBonus + PARAMS.restBpmBonusPerHand);
    }

    function setHeartWrapTransform(str: string, transition?: string) {
      heartWrapEl!.style.transition = transition === undefined ? "" : transition;
      heartWrapEl!.style.transform = str;
    }

    // ============================================================
    // Finale: all five hands gone + erase threshold reached →
    // auto-complete + big beat + wing-flap + morph + blink
    // ============================================================
    function onFullyHealed() {
      if (finaleFired) return;
      finaleFired = true;

      if (REDUCED_MOTION) {
        corruptCanvas!.style.display = "none";
        phraseSpans.forEach((p) => p.el.classList.add("gone"));
        bigQuestionRef.current?.classList.add("ky-show");
        actOneFinished = true;
        return;
      }

      corruptCanvas!.style.transition = "opacity 700ms cubic-bezier(0.22,1,0.36,1)";
      requestAnimationFrame(() => {
        corruptCanvas!.style.opacity = "0";
      });
      setT(() => {
        corruptCanvas!.style.display = "none";
        // 黑壳彻底退场后，搏动层升级为完整心脏——自由搏动
        finaleFullBeat = true;
        beatDirty = true;
      }, 720);

      pauseBeatUntil = Infinity;
      setHeartWrapTransform("scale(1.09) scaleX(1.03) translateY(-10px)", "600ms cubic-bezier(0.22,1,0.36,1)");
      setT(() => {
        setHeartWrapTransform("scale(1) scaleX(1) translateY(0)", "600ms cubic-bezier(0.22,1,0.36,1)");
        setT(() => {
          setHeartWrapTransform("scale(1)");
          beatTime = 0;
          pauseBeatUntil = 0;
        }, 620);
      }, 620);

      setT(() => {
        morphPhrase();
      }, 700);

      const morphMs = PHRASE_OLD.length * 45 + 460 + 950;
      setT(() => {
        if (actOneFinished) return;
        actOneFinished = true;
        runBlink();
      }, 700 + morphMs + 1200);
    }

    // ============================================================
    // Low-res grid progress sampling (32x48, every 500ms)
    // ============================================================
    let lastSampleTs = 0;

    function sampleProgress() {
      sampleCtx.clearRect(0, 0, GRID_W, GRID_H);
      sampleCtx.drawImage(corruptCanvas!, 0, 0, IMG_W, IMG_H, 0, 0, GRID_W, GRID_H);
      let data: Uint8ClampedArray;
      try {
        data = sampleCtx.getImageData(0, 0, GRID_W, GRID_H).data;
      } catch {
        return;
      }

      const totalCells = GRID_W * GRID_H;
      let erasedTotal = 0;
      for (let c = 0; c < totalCells; c++) {
        if (data[c * 4 + 3] < 128) erasedTotal++;
      }
      overallErasedFraction = erasedTotal / totalCells;

      HANDS.forEach((hand) => {
        if (hand.disintegrated) return;
        let erased = 0;
        for (let i = 0; i < hand.cells.length; i++) {
          const cellIdx = hand.cells[i];
          if (data[cellIdx * 4 + 3] < 128) erased++;
        }
        hand.progress = hand.cells.length ? erased / hand.cells.length : 0;
        if (hand.progress >= PARAMS.handThresholdPct / 100) {
          triggerHandDisintegrate(hand);
        }
      });

      if (!finaleFired && disintegratedCount === HANDS.length && overallErasedFraction >= PARAMS.healThresholdPct / 100) {
        onFullyHealed();
      }
    }

    // ============================================================
    // Pointer / touch — move to erase, stillness produces no scratching
    // ============================================================
    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.42;
    let fireX = pointerX;
    let fireY = pointerY;
    let lastErase: { x: number; y: number } | null = null;

    function onPointerMove(x: number, y: number, isNewStroke: boolean) {
      pointerX = x;
      pointerY = y;
      if (REDUCED_MOTION || finaleFired) return;

      const rect = corruptCanvas!.getBoundingClientRect();
      if (rect.width <= 0) return;
      const k = IMG_W / rect.width;
      const cx = (x - rect.left) * k;
      const cy = (y - rect.top) * k;
      const rPx = PARAMS.brushRadius * k;

      if (isNewStroke || lastErase == null) {
        stampBrush(cx, cy, rPx);
      } else {
        eraseSegment(lastErase.x, lastErase.y, cx, cy, rPx);
      }
      lastErase = { x: cx, y: cy };
    }

    function handleMouseMove(e: MouseEvent) {
      onPointerMove(e.clientX, e.clientY, false);
    }
    function handleTouchStart(e: TouchEvent) {
      if (e.touches && e.touches.length) {
        lastErase = null;
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }
    function handleTouchMove(e: TouchEvent) {
      if (e.touches && e.touches.length) onPointerMove(e.touches[0].clientX, e.touches[0].clientY, false);
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // ============================================================
    // Fire cursor physics: lean + stretch + overshoot wobble + flicker
    // ============================================================
    let prevFireX = pointerX;
    let prevFireY = pointerY;
    let smVX = 0;
    let smVY = 0;
    let prevSmSpeed = 0;
    let wobbleActive = false;
    let wobbleStart = 0;
    let flickerCurrent = 1;
    let flickerTarget = 1;
    let flickerNextAt = 0;

    function clamp(v: number, lo: number, hi: number) {
      return Math.max(lo, Math.min(hi, v));
    }

    function updateFireCursor(ts: number) {
      fireX = clamp(pointerX, 12, window.innerWidth - 12);
      fireY = clamp(pointerY, 12, window.innerHeight - 12);

      const rawVX = fireX - prevFireX;
      const rawVY = fireY - prevFireY;
      prevFireX = fireX;
      prevFireY = fireY;

      smVX += (rawVX - smVX) * 0.35;
      smVY += (rawVY - smVY) * 0.35;
      const smSpeed = Math.hypot(smVX, smVY);

      if (prevSmSpeed > 6 && smSpeed < 2 && !wobbleActive) {
        wobbleActive = true;
        wobbleStart = ts;
      }
      prevSmSpeed = smSpeed;

      let leanDeg = clamp(-smVX * 3.0 - smVY * 0.6, -42, 42);
      const skewDeg = clamp(smVY * 1.4, -14, 14);
      const stretch = 1 + Math.min(0.5, smSpeed * 0.03);

      if (wobbleActive) {
        const wt = ts - wobbleStart;
        if (wt > 500) {
          wobbleActive = false;
        } else {
          leanDeg += Math.sin(wt / 40) * 9 * Math.exp(-wt / 180);
        }
      }

      if (ts > flickerNextAt) {
        flickerTarget = 0.82 + Math.random() * 0.36;
        flickerNextAt = ts + 70 + Math.random() * 160;
      }
      flickerCurrent += (flickerTarget - flickerCurrent) * 0.3;

      fireCursorEl!.style.transform = `translate3d(${fireX.toFixed(1)}px,${fireY.toFixed(1)}px,0)`;
      const leanStr =
        `rotate(${leanDeg.toFixed(1)}deg) skewX(${skewDeg.toFixed(1)}deg) scaleY(` +
        `${(stretch * (0.92 + flickerCurrent * 0.16)).toFixed(3)}) scaleX(${(0.9 + (1 - flickerCurrent) * 0.28).toFixed(3)})`;
      flameOuterEl!.style.transform = leanStr;
      flameOuterEl!.style.opacity = clamp(0.68 + flickerCurrent * 0.3, 0, 1).toFixed(3);
      flameCoreEl!.style.transform = leanStr + " scale(0.9)";
      flameCoreEl!.style.opacity = clamp(0.75 + flickerCurrent * 0.24, 0, 1).toFixed(3);

      root!.style.setProperty("--ky-mx", fireX.toFixed(1) + "px");
      root!.style.setProperty("--ky-my", fireY.toFixed(1) + "px");

      if (smSpeed > 1.2) {
        spawnSparks(fireX, fireY, -smVX, -smVY);
      }
    }

    // ============================================================
    // Blink transition — close the eyelids, then hand off to onDone
    // ============================================================
    function setEyelids(closed: boolean, durationMs: number, timingFn: string, cb?: () => void) {
      eyelidTop!.style.transition = `transform ${durationMs}ms ${timingFn}`;
      eyelidBottom!.style.transition = `transform ${durationMs}ms ${timingFn}`;
      requestAnimationFrame(() => {
        eyelidTop!.style.transform = closed ? "translateY(0)" : "translateY(calc(-100% - 32px))";
        eyelidBottom!.style.transform = closed ? "translateY(0)" : "translateY(calc(100% + 32px))";
      });
      if (cb) setT(cb, durationMs);
    }

    function buildEyelidPaths() {
      const { topPath, bottomPath } = buildEyelidClipPaths(window.innerWidth, window.innerHeight);
      eyelidTop!.style.clipPath = `path("${topPath}")`;
      eyelidBottom!.style.clipPath = `path("${bottomPath}")`;
    }

    // Finish Act One: reduced-motion completes instantly; otherwise close the
    // eyelids and, once the screen is fully black (200ms close + a 180ms
    // hold to mask the handoff jank), call onDone — the parent takes it from
    // there (unmounts us, opens the eyelids over the revealed main site).
    function runBlink() {
      if (REDUCED_MOTION) {
        onDoneRef.current();
        return;
      }
      if (blinkInProgress) return;
      blinkInProgress = true;
      setEyelids(true, 200, "ease-in", () => {
        setT(() => {
          onDoneRef.current();
        }, 180);
      });
    }

    function redrawCorruptFull() {
      ctx!.clearRect(0, 0, IMG_W, IMG_H);
      ctx!.globalCompositeOperation = "source-over";
      ctx!.drawImage(corruptedSrcImg!, 0, 0, IMG_W, IMG_H);
    }

    // ============================================================
    // Main loop
    // ============================================================
    let rafId: number | null = null;

    function mainFrame(ts: number) {
      rafId = requestAnimationFrame(mainFrame);

      if (lastTs == null) lastTs = ts;
      let dt = ts - lastTs;
      lastTs = ts;
      if (dt > 80) dt = 80;
      const dtSec = dt / 1000;

      updateFireCursor(ts);
      updateSparks(dtSec);
      updateAsh(dtSec);
      renderFx();
      updatePhraseFloat(ts);

      if (ts - lastSampleTs >= PARAMS.idleSampleMs) {
        lastSampleTs = ts;
        if (!finaleFired) sampleProgress();
      }

      if (beatDirty) {
        syncBeatCanvas();
        rebuildWings();
      }

      // 翅膀扇动：被缚仅微颤(挣扎)，随治愈进度放大到自由扇动
      if (wingsOn) {
        const p = finaleFullBeat ? 1 : overallErasedFraction;
        const ampDeg = (0.3 + p * 1.9) * PARAMS.wingAmp;
        const omega = 0.006 - p * 0.0046; // 束缚快而弱 → 自由慢而阔
        const a = ampDeg * Math.sin(ts * omega);
        const sx = 1 + Math.max(0, a) * 0.004;
        wingL!.style.transform = `rotate(${a.toFixed(3)}deg) scaleX(${sx.toFixed(4)})`;
        wingR!.style.transform = `rotate(${(-a).toFixed(3)}deg) scaleX(${sx.toFixed(4)})`;
      }

      if (ts >= pauseBeatUntil) {
        beatTime += dt;
        const targetBpm = PARAMS.restBpm + restBpmBonus + overallErasedFraction * 10;
        bpmSmoothed += (targetBpm - bpmSmoothed) * Math.min(1, dt * 0.006);
        const Tc = 60000 / Math.max(1, bpmSmoothed);
        const phase = beatTime % Tc;
        const ampFactor = 1 + (disintegratedCount / HANDS.length) * 0.35;
        const s = 1 + (heartScaleAt(phase, ampFactor) - 1) * 0.62;
        setBeatTransform(`scale(${Math.min(s, 1.025).toFixed(4)})`);

        if (!finaleFired) {
          const pulseNorm = Math.max(0, s - 1) / (0.028 * ampFactor);
          const warm = Math.min(0.9, overallErasedFraction * 0.5 + pulseNorm * 0.15);
          const filterStr = `brightness(${(1 - warm * 0.08 + pulseNorm * 0.03).toFixed(3)})`;
          corruptCanvas!.style.filter = filterStr;
          corruptCanvasBeat!.style.filter = filterStr;
        }
      }

      if (!REDUCED_MOTION) {
        const pk = PARAMS.parallaxStrength;
        const tnx = (pointerX / window.innerWidth - 0.5) * 2;
        const tny = (pointerY / window.innerHeight - 0.5) * 2;
        parX += (tnx - parX) * Math.min(1, dt * 0.004);
        parY += (tny - parY) * Math.min(1, dt * 0.004);
        sceneEl!.style.transform = `rotateX(${(-parY * 2.2 * pk).toFixed(3)}deg) rotateY(${(parX * 2.2 * pk).toFixed(3)}deg)`;
        textureLayerEl!.style.transform = `translate(${(-parX * 8 * pk).toFixed(1)}px,${(-parY * 8 * pk).toFixed(1)}px)`;
        // 批注层与画同体（不做独立视差）；终幕大字是"活字"，走近景层
        if (bigQuestionRef.current) {
          bigQuestionRef.current.style.translate = `${(parX * 14 * pk).toFixed(1)}px ${(parY * 14 * pk).toFixed(1)}px`;
        }
      }
    }

    // ============================================================
    // Hint / skip
    // ============================================================
    let hintTimer: ReturnType<typeof setTimeout> | null = null;
    let skipTimer: ReturnType<typeof setTimeout> | null = null;
    const HINT_FADE_DELAY = 8000;
    const SKIP_DELAY_MS = 6000;

    function initHintTimer() {
      clearT(hintTimer);
      hintTimer = setT(() => {
        hintEl!.classList.add("hidden");
      }, HINT_FADE_DELAY);
    }

    function initSkipTimer() {
      clearT(skipTimer);
      skipTimer = setT(() => {
        skipLinkEl!.classList.add("show");
      }, SKIP_DELAY_MS);
    }

    function handleSkipClick() {
      if (actOneFinished) return;
      actOneFinished = true;
      runBlink();
    }
    skipLinkEl.addEventListener("click", handleSkipClick);

    // ============================================================
    // reduced-motion: clicking the heart completes healing instantly
    // ============================================================
    function initReducedMotionClick() {
      heartStageEl!.classList.add("clickable");
      heartStageEl!.onclick = () => {
        if (finaleFired) return;
        HANDS.forEach((h) => {
          h.disintegrated = true;
        });
        disintegratedCount = HANDS.length;
        overallErasedFraction = 1;
        onFullyHealed();
      };
    }

    // ============================================================
    // Tuning panel
    // ============================================================
    function initPanel() {
      const map: {
        id: string;
        val: string;
        key: keyof typeof PARAMS;
        decimals: number;
        onChange?: (v: number) => void;
      }[] = [
        {
          id: "ky-p-brushRadius",
          val: "ky-v-brushRadius",
          key: "brushRadius",
          decimals: 0,
          onChange: (v) => root!.style.setProperty("--ky-brush-radius", v + "px"),
        },
        { id: "ky-p-sparkDensity", val: "ky-v-sparkDensity", key: "sparkDensity", decimals: 1 },
        { id: "ky-p-ashCount", val: "ky-v-ashCount", key: "ashCount", decimals: 0 },
        { id: "ky-p-restBpm", val: "ky-v-restBpm", key: "restBpm", decimals: 0 },
        {
          id: "ky-p-veilStrength",
          val: "ky-v-veilStrength",
          key: "veilStrength",
          decimals: 2,
          onChange: (v) => root!.style.setProperty("--ky-veil-strength", String(v)),
        },
        {
          id: "ky-p-textureOpacity",
          val: "ky-v-textureOpacity",
          key: "textureOpacityMax",
          decimals: 2,
          onChange: (v) => root!.style.setProperty("--ky-texture-real-opacity-max", String(v)),
        },
        { id: "ky-p-healThreshold", val: "ky-v-healThreshold", key: "healThresholdPct", decimals: 0 },
        { id: "ky-p-parallax", val: "ky-v-parallax", key: "parallaxStrength", decimals: 1 },
        { id: "ky-p-wingAmp", val: "ky-v-wingAmp", key: "wingAmp", decimals: 1 },
      ];

      const inputHandlers: { input: HTMLInputElement; handler: () => void }[] = [];

      map.forEach((m) => {
        const input = panel!.querySelector<HTMLInputElement>(`#${m.id}`);
        const out = panel!.querySelector<HTMLSpanElement>(`#${m.val}`);
        if (!input || !out) return;
        input.value = String(PARAMS[m.key]);
        out.textContent = Number(PARAMS[m.key]).toFixed(m.decimals);
        const handler = () => {
          const v = parseFloat(input.value);
          (PARAMS as unknown as Record<string, number>)[m.key] = v;
          out.textContent = v.toFixed(m.decimals);
          if (m.onChange) m.onChange(v);
        };
        input.addEventListener("input", handler);
        inputHandlers.push({ input, handler });
      });

      function handleKeydown(e: KeyboardEvent) {
        if (e.key === "d" || e.key === "D") {
          panel!.classList.toggle("open");
        }
      }
      window.addEventListener("keydown", handleKeydown);

      function handlePanelToggle() {
        panel!.classList.toggle("open");
      }
      panelToggleBtn!.addEventListener("click", handlePanelToggle);

      return () => {
        inputHandlers.forEach(({ input, handler }) => input.removeEventListener("input", handler));
        window.removeEventListener("keydown", handleKeydown);
        panelToggleBtn!.removeEventListener("click", handlePanelToggle);
      };
    }
    const cleanupPanel = initPanel();

    // ============================================================
    // resize
    // ============================================================
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function onResize() {
      clearT(resizeTimer);
      resizeTimer = setT(() => {
        resizeFxCanvas();
        buildTexture();
        layoutPhraseCloud();
        buildEyelidPaths();
      }, 200);
    }
    window.addEventListener("resize", onResize);

    // ============================================================
    // init
    // ============================================================
    root.style.setProperty("--ky-texture-base-opacity", "0.015");
    root.style.setProperty("--ky-texture-real-opacity-max", String(PARAMS.textureOpacityMax));
    root.style.setProperty("--ky-veil-strength", String(PARAMS.veilStrength));

    if (window.innerWidth < 600) {
      PARAMS.brushRadius = Math.min(PARAMS.brushRadius, 42);
      root.style.setProperty("--ky-heart-w", "min(72vw, 53vh)");
    }
    root.style.setProperty("--ky-brush-radius", PARAMS.brushRadius + "px");

    resizeFxCanvas();
    buildPhraseCloud();
    buildTexture();
    layoutPhraseCloud();
    buildEyelidPaths();
    initHintTimer();
    initSkipTimer();

    root.style.setProperty("--ky-mx", pointerX.toFixed(1) + "px");
    root.style.setProperty("--ky-my", pointerY.toFixed(1) + "px");

    function onCorruptedLoaded() {
      origCtx.drawImage(corruptedSrcImg!, 0, 0, IMG_W, IMG_H);
      redrawCorruptFull();

      if (REDUCED_MOTION) {
        corruptCanvas!.style.filter = "";
        corruptCanvasBeat!.style.filter = "";
        initReducedMotionClick();
      } else {
        rafId = requestAnimationFrame(mainFrame);
      }
    }

    if (corruptedSrcImg.complete && corruptedSrcImg.naturalWidth > 0) {
      onCorruptedLoaded();
    } else {
      corruptedSrcImg.addEventListener("load", onCorruptedLoaded);
    }

    return () => {
      alive = false;
      if (rafId != null) cancelAnimationFrame(rafId);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", onResize);
      skipLinkEl.removeEventListener("click", handleSkipClick);
      corruptedSrcImg.removeEventListener("load", onCorruptedLoaded);
      cleanupPanel();
    };
  }, []);

  return (
    <div ref={rootRef} id="ky-stage" className="ky-stage">
      <div id="ky-scene" ref={sceneRef} className="ky-scene">
        <div id="ky-stageWarmth" ref={stageWarmthRef} className="ky-stageWarmth" />
        <div id="ky-textureLayer" ref={textureLayerRef} className="ky-textureLayer">
          <div id="ky-textureBase" ref={textureBaseRef} className="ky-textureBase" />
          <div id="ky-textureReal" ref={textureRealRef} className="ky-textureReal" />
        </div>

        <div id="ky-heartStage" ref={heartStageRef} className="ky-heartStage">
          <div id="ky-heartWrap" ref={heartWrapRef} className="ky-heartWrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="ky-healedImg"
              ref={healedImgRef}
              className="ky-healedImg"
              src="/kaiyan/heart-healed.jpg"
              alt=""
              draggable={false}
            />
            <canvas id="ky-corruptCanvas" ref={corruptCanvasRef} className="ky-corruptCanvas" width={IMG_W} height={IMG_H} />
            {/* 扇动翅膀：各切一片当前复合画面，翅根为轴摆动，盖住底下静态翅膀 */}
            <canvas id="ky-wingL" ref={wingLRef} className="ky-wing ky-wingL" width={IMG_W} height={IMG_H} />
            <canvas id="ky-wingR" ref={wingRRef} className="ky-wing ky-wingR" width={IMG_W} height={IMG_H} />
            <div id="ky-beatLayer" ref={beatLayerRef} className="ky-beatLayer">
              {/* 搏动层只有一张画布：治愈图∩已擦除区（见 syncBeatCanvas） */}
              <canvas
                id="ky-corruptCanvasBeat"
                ref={corruptCanvasBeatRef}
                className="ky-corruptCanvasBeat"
                width={IMG_W}
                height={IMG_H}
              />
            </div>
          </div>
        </div>

        <div id="ky-phraseLayer" ref={phraseLayerRef} className="ky-phraseLayer" />
        <div ref={sealRef} className="ky-seal" aria-hidden="true">馬</div>

        <div ref={bigQuestionRef} className="ky-bigQuestion" aria-hidden="true">
          <div className="ky-bigQuestion-line">你想要</div>
          <div className="ky-bigQuestion-line">怎样活这一生？</div>
        </div>
      </div>

      <div id="ky-veil" ref={veilRef} className="ky-veil" />

      <canvas id="ky-fxCanvas" ref={fxCanvasRef} className="ky-fxCanvas" />

      <div id="ky-fireCursor" ref={fireCursorRef} className="ky-fireCursor">
        <div className="ky-flameGlow" />
        <div id="ky-flameOuter" ref={flameOuterRef} className="ky-flameOuter" />
        <div id="ky-flameCore" ref={flameCoreRef} className="ky-flameCore" />
      </div>

      <div id="ky-hint" ref={hintRef} className="ky-hint">
        移动火种，擦亮心脏
      </div>
      <div id="ky-skipLink" ref={skipLinkRef} className="ky-skipLink">
        跳过 →
      </div>

      <div id="ky-eyelidTop" ref={eyelidTopRef} className="ky-eyelidTop" />
      <div id="ky-eyelidBottom" ref={eyelidBottomRef} className="ky-eyelidBottom" />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        id="ky-corruptedSrcImg"
        ref={corruptedSrcImgRef}
        src="/kaiyan/heart-corrupted.jpg"
        alt=""
        style={{ display: "none" }}
      />

      <button type="button" id="ky-panelToggle" ref={panelToggleRef} className="ky-panelToggle" aria-label="调参面板">
        ⚙
      </button>

      <div id="ky-panel" ref={panelRef} className="ky-panel">
        <h3>调参面板 (d 隐藏)</h3>

        <label>
          刷子半径 px
          <div className="ky-row">
            <input type="range" id="ky-p-brushRadius" min={30} max={100} step={2} />
            <span className="ky-val" id="ky-v-brushRadius" />
          </div>
        </label>
        <label>
          火星密度
          <div className="ky-row">
            <input type="range" id="ky-p-sparkDensity" min={0} max={3} step={0.1} />
            <span className="ky-val" id="ky-v-sparkDensity" />
          </div>
        </label>
        <label>
          灰烬数量
          <div className="ky-row">
            <input type="range" id="ky-p-ashCount" min={80} max={150} step={5} />
            <span className="ky-val" id="ky-v-ashCount" />
          </div>
        </label>
        <label>
          静息 bpm
          <div className="ky-row">
            <input type="range" id="ky-p-restBpm" min={30} max={70} step={1} />
            <span className="ky-val" id="ky-v-restBpm" />
          </div>
        </label>
        <label>
          暗纱强度
          <div className="ky-row">
            <input type="range" id="ky-p-veilStrength" min={0} max={0.25} step={0.01} />
            <span className="ky-val" id="ky-v-veilStrength" />
          </div>
        </label>
        <label>
          底纹圈内 opacity
          <div className="ky-row">
            <input type="range" id="ky-p-textureOpacity" min={0} max={0.4} step={0.01} />
            <span className="ky-val" id="ky-v-textureOpacity" />
          </div>
        </label>
        <label>
          治愈完成阈值 %
          <div className="ky-row">
            <input type="range" id="ky-p-healThreshold" min={70} max={100} step={1} />
            <span className="ky-val" id="ky-v-healThreshold" />
          </div>
        </label>
        <label>
          视差强度
          <div className="ky-row">
            <input type="range" id="ky-p-parallax" min={0} max={2} step={0.1} />
            <span className="ky-val" id="ky-v-parallax" />
          </div>
        </label>
        <label>
          翅膀幅度
          <div className="ky-row">
            <input type="range" id="ky-p-wingAmp" min={0} max={3} step={0.1} />
            <span className="ky-val" id="ky-v-wingAmp" />
          </div>
        </label>
      </div>

      <style jsx global>{`
        .ky-stage {
          position: fixed;
          inset: 0;
          z-index: 100;
          overflow: hidden;
          cursor: none;
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
          perspective: 1100px;
          background: var(--color-bg);
          font-family: var(--font-serif);
        }

        .ky-scene {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          will-change: transform;
        }
        .ky-textureLayer,
        .ky-phraseLayer {
          will-change: transform;
        }

        .ky-textureLayer {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .ky-textureBase,
        .ky-textureReal {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .ky-textureBase {
          opacity: var(--ky-texture-base-opacity);
        }
        .ky-textureReal {
          opacity: var(--ky-texture-real-opacity-max);
          -webkit-mask-image: radial-gradient(circle var(--ky-brush-radius) at var(--ky-mx) var(--ky-my), #000 0%, #000 55%, transparent 100%);
          mask-image: radial-gradient(circle var(--ky-brush-radius) at var(--ky-mx) var(--ky-my), #000 0%, #000 55%, transparent 100%);
        }
        .ky-memory-phrase {
          position: absolute;
          white-space: nowrap;
          color: var(--color-ink);
          font-size: 12px;
          line-height: 1;
          letter-spacing: 0.02em;
        }

        .ky-heartStage {
          position: absolute;
          left: 50%;
          top: 44vh;
          transform: translate(-50%, -50%);
          width: var(--ky-heart-w, min(92vw, 53vh));
          aspect-ratio: 1024 / 1536;
          z-index: 2;
          overflow: visible;
        }
        .ky-heartWrap {
          position: absolute;
          inset: 0;
          will-change: transform;
          -webkit-mask-image: radial-gradient(ellipse 72% 66% at 50% 48%, #000 58%, rgba(0, 0, 0, 0.55) 78%, transparent 98%);
          mask-image: radial-gradient(ellipse 72% 66% at 50% 48%, #000 58%, rgba(0, 0, 0, 0.55) 78%, transparent 98%);
        }
        .ky-stageWarmth {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(
            ellipse 60% 55% at 50% 44%,
            rgba(196, 178, 142, 0.5) 0%,
            rgba(214, 199, 168, 0.28) 45%,
            rgba(230, 222, 204, 0.12) 70%,
            transparent 100%
          );
        }
        .ky-healedImg,
        .ky-corruptCanvas,
        .ky-corruptCanvasBeat {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          -webkit-user-drag: none;
          pointer-events: none;
        }
        .ky-healedImg {
          object-fit: fill;
        }
        .ky-corruptCanvas,
        .ky-corruptCanvasBeat {
          display: block;
        }
        .ky-heartStage.clickable {
          pointer-events: auto;
          cursor: pointer;
        }

        /* 扇动翼片：翅根为轴、常态微放大盖住底下静态翅膀防双影 */
        .ky-wing {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          -webkit-user-drag: none;
          will-change: transform;
        }
        .ky-wingL {
          transform-origin: 60% 47%;
        }
        .ky-wingR {
          transform-origin: 40% 47%;
        }

        .ky-beatLayer {
          position: absolute;
          inset: 0;
          will-change: transform;
          transform-origin: 51% 47%;
          -webkit-mask-image: radial-gradient(ellipse 26% 31% at 51% 47%, #000 58%, rgba(0, 0, 0, 0.5) 80%, transparent 100%);
          mask-image: radial-gradient(ellipse 26% 31% at 51% 47%, #000 58%, rgba(0, 0, 0, 0.5) 80%, transparent 100%);
        }

        .ky-phraseLayer {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
        }
        .ky-phrase-ch {
          position: absolute;
          display: inline-block;
          /* 古图谱批注体：偏褐墨色 + multiply 融进羊皮纸，字是画的一部分 */
          color: rgba(48, 36, 24, 0.88);
          mix-blend-mode: multiply;
          font-weight: 500;
          line-height: 1;
          text-shadow: 0.5px 0.8px 1px rgba(26, 26, 26, 0.2);
          opacity: 1;
          filter: blur(0);
          transition: opacity 450ms cubic-bezier(0.22, 1, 0.36, 1), filter 450ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .ky-phrase-ch.fading {
          opacity: 0;
          filter: blur(4px);
        }
        .ky-phrase-ch.gone {
          opacity: 0;
          filter: blur(4px);
          pointer-events: none;
        }

        /* 落款朱砂印：白字暗红底、微斜、multiply 压进纸 */
        .ky-seal {
          position: absolute;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f5efe6;
          background: var(--color-accent);
          border-radius: 14%;
          font-weight: 700;
          line-height: 1;
          mix-blend-mode: multiply;
          opacity: 0.8;
          transform: rotate(-3deg);
          box-shadow: inset 0 0 0 1.5px rgba(245, 239, 230, 0.35);
          transition: opacity 400ms cubic-bezier(0.22, 1, 0.36, 1), filter 400ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
          will-change: opacity;
        }
        .ky-seal.ky-seal-gone {
          opacity: 0;
          filter: blur(3px);
        }

        /* 终幕大字：恢复原 Hero 的居中大字排版——批注是古书上的旧剧本，
           这两行是活着的问题。软纸光晕保证压在画上也清晰。 */
        .ky-bigQuestion {
          position: fixed;
          left: 50%;
          top: 47vh;
          transform: translateX(-50%);
          z-index: 30;
          text-align: center;
          pointer-events: none;
          padding: 4vh 7vw;
          background: radial-gradient(
            ellipse 100% 100% at 50% 50%,
            rgba(250, 250, 248, 0.88) 0%,
            rgba(250, 250, 248, 0.55) 62%,
            rgba(250, 250, 248, 0) 100%
          );
          /* 未触发时整个容器（含纸光晕底）不可见，否则光晕会提前渗到画上 */
          opacity: 0;
          visibility: hidden;
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 700ms;
        }
        .ky-bigQuestion.ky-show {
          opacity: 1;
          visibility: visible;
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s;
        }
        .ky-bigQuestion-line {
          font-size: clamp(38px, 7.6vw, 76px);
          font-weight: 500;
          letter-spacing: 0.06em;
          line-height: 1.34;
          white-space: nowrap;
          color: var(--color-ink);
          opacity: 0;
          filter: blur(6px);
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), filter 700ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ky-bigQuestion-line:nth-child(2) {
          transition-delay: 260ms;
        }
        .ky-bigQuestion.ky-show .ky-bigQuestion-line {
          opacity: 1;
          filter: blur(0);
        }

        .ky-veil {
          position: absolute;
          inset: 0;
          z-index: 3;
          background: var(--color-ink);
          opacity: var(--ky-veil-strength);
          -webkit-mask-image: radial-gradient(circle var(--ky-brush-radius) at var(--ky-mx) var(--ky-my), transparent 0%, transparent 58%, black 100%);
          mask-image: radial-gradient(circle var(--ky-brush-radius) at var(--ky-mx) var(--ky-my), transparent 0%, transparent 58%, black 100%);
          pointer-events: none;
        }

        .ky-fxCanvas {
          position: fixed;
          inset: 0;
          z-index: 5;
          pointer-events: none;
        }

        .ky-fireCursor {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 6;
          pointer-events: none;
          will-change: transform;
        }
        .ky-flameGlow {
          position: absolute;
          left: 50%;
          top: 50%;
          width: calc(var(--ky-brush-radius) * 2.1);
          height: calc(var(--ky-brush-radius) * 2.1);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232, 201, 125, 0.32) 0%, rgba(232, 201, 125, 0.14) 42%, rgba(139, 46, 46, 0.05) 72%, rgba(139, 46, 46, 0) 100%);
          filter: blur(6px);
        }
        .ky-flameOuter {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 30px;
          height: 42px;
          margin-left: -15px;
          margin-top: -34px;
          border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
          background: radial-gradient(ellipse at 50% 72%, #e8c97d 0%, #e8c97d 38%, var(--color-accent) 78%, rgba(139, 46, 46, 0) 100%);
          opacity: 0.88;
          transform-origin: 50% 88%;
        }
        .ky-flameCore {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 13px;
          height: 21px;
          margin-left: -6.5px;
          margin-top: -26px;
          border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%;
          background: radial-gradient(ellipse at 50% 75%, var(--color-bg) 0%, #e8c97d 55%, var(--color-accent) 100%);
          opacity: 0.96;
          transform-origin: 50% 88%;
        }

        .ky-hint {
          position: absolute;
          top: 8%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 11;
          font-size: 13px;
          color: rgba(26, 26, 26, 0.34);
          letter-spacing: 0.06em;
          text-align: center;
          pointer-events: none;
          transition: opacity 1200ms ease-out;
        }
        .ky-hint.hidden {
          opacity: 0;
        }

        .ky-skipLink {
          position: absolute;
          right: 22px;
          bottom: 20px;
          z-index: 11;
          font-size: 12px;
          color: rgba(26, 26, 26, 0.32);
          letter-spacing: 0.04em;
          opacity: 0;
          pointer-events: none;
          transition: opacity 900ms ease-out;
          cursor: pointer;
        }
        .ky-skipLink.show {
          opacity: 1;
          pointer-events: auto;
        }
        .ky-skipLink:hover {
          color: var(--color-accent);
        }

        .ky-panelToggle {
          position: fixed;
          right: 8px;
          bottom: 8px;
          z-index: 201;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: var(--color-ink);
          opacity: 0.3;
          font-size: 14px;
          line-height: 24px;
          text-align: center;
          cursor: pointer;
          pointer-events: auto;
          -webkit-tap-highlight-color: transparent;
        }
        .ky-panelToggle:active {
          opacity: 0.6;
        }

        .ky-eyelidTop,
        .ky-eyelidBottom {
          position: fixed;
          left: 0;
          width: 100%;
          background: var(--color-ink);
          z-index: 100;
          pointer-events: none;
        }
        .ky-eyelidTop {
          top: 0;
          height: 78vh;
          transform: translateY(calc(-100% - 32px));
          filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.25));
        }
        .ky-eyelidBottom {
          bottom: 0;
          height: 34vh;
          transform: translateY(calc(100% + 32px));
          filter: drop-shadow(0 -8px 20px rgba(0, 0, 0, 0.25));
        }

        .ky-panel {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 200;
          width: 260px;
          padding: 14px 16px 16px;
          background: rgba(250, 250, 248, 0.9);
          border: 1px solid rgba(26, 26, 26, 0.15);
          border-radius: 6px;
          font-family: -apple-system, "PingFang SC", sans-serif;
          font-size: 11px;
          color: var(--color-ink);
          backdrop-filter: blur(6px);
          display: none;
          pointer-events: auto;
          max-height: 90vh;
          overflow-y: auto;
        }
        .ky-panel.open {
          display: block;
        }
        .ky-panel h3 {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .ky-panel label {
          display: block;
          margin-top: 9px;
          color: rgba(26, 26, 26, 0.7);
        }
        .ky-panel .ky-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .ky-panel input[type="range"] {
          width: 100%;
          margin-top: 3px;
          accent-color: var(--color-accent);
        }
        .ky-panel .ky-val {
          font-variant-numeric: tabular-nums;
          color: rgba(26, 26, 26, 0.5);
        }

        @media (prefers-reduced-motion: reduce) {
          .ky-phrase-ch {
            transition: opacity 1ms linear, filter 1ms linear;
          }
          .ky-veil {
            display: none;
          }
          .ky-fireCursor {
            display: none;
          }
          .ky-fxCanvas {
            display: none;
          }
          .ky-eyelidTop,
          .ky-eyelidBottom {
            transition: none !important;
          }
          .ky-skipLink {
            transition: none;
          }
          .ky-heartWrap {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
