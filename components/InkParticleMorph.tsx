"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 「不同版本的我」——Three.js 水墨粒子 morph（可玩小实验原型）
 * 同一把粒子，不断重组成不同的字/形，呼应"长出下一个我 / 不同版本的我"。
 * 闲时轻漂，鼠标/手指带着转，点一下换下一个形。纯前端、静态导出安全。
 */

const FORMS = ["马泽闰", "严父", "慈母", "视角", "下一个我"];
const COUNT = 5000; // 粒子数
const WORLD = 4.2; // 世界尺度（字铺满视野）

// 把一段文字栅格化，采样出 COUNT 个墨点的世界坐标
function sampleText(text: string): Float32Array {
  const S = 512;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fs =
    text.length <= 1 ? 340 : text.length === 2 ? 250 : text.length === 3 ? 190 : 150;
  ctx.font = `700 ${fs}px "Songti SC", "STSong", "SimSun", serif`;
  ctx.fillText(text, S / 2, S / 2);

  const data = ctx.getImageData(0, 0, S, S).data;
  const pts: number[][] = [];
  for (let y = 0; y < S; y += 2) {
    for (let x = 0; x < S; x += 2) {
      if (data[(y * S + x) * 4 + 3] > 128) pts.push([x, y]);
    }
  }
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // 确定性伪随机取像素 → morph 呈现墨点重组、而非扫描擦除
    const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453);
    const p = pts.length ? pts[Math.floor((r - Math.floor(r)) * pts.length)] : [S / 2, S / 2];
    out[i * 3] = (p[0] / S - 0.5) * WORLD;
    out[i * 3 + 1] = -(p[1] / S - 0.5) * WORLD;
    const rz = Math.abs(Math.sin(i * 78.233) * 43758.5453);
    out[i * 3 + 2] = ((rz - Math.floor(rz)) - 0.5) * 0.35; // 薄薄的体积
  }
  return out;
}

function ParticleField({
  forms,
  index,
  mouse,
}: {
  forms: Float32Array[];
  index: number;
  mouse: React.RefObject<{ x: number; y: number }>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const eased = useRef<Float32Array>(forms[0].slice());

  const initial = useMemo(() => forms[0].slice(), [forms]);

  useFrame((state) => {
    const geom = geomRef.current;
    const pts = pointsRef.current;
    if (!geom || !pts) return;
    const target = forms[index];
    const cur = eased.current;
    const arr = geom.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      cur[ix] += (target[ix] - cur[ix]) * 0.045;
      cur[ix + 1] += (target[ix + 1] - cur[ix + 1]) * 0.045;
      cur[ix + 2] += (target[ix + 2] - cur[ix + 2]) * 0.045;
      // 闲时轻漂，让它"活着"
      arr[ix] = cur[ix] + 0.012 * Math.sin(t * 0.8 + i);
      arr[ix + 1] = cur[ix + 1] + 0.012 * Math.cos(t * 0.7 + i * 1.3);
      arr[ix + 2] = cur[ix + 2];
    }
    geom.attributes.position.needsUpdate = true;

    // 缓慢自转 + 鼠标/手指视差
    const mx = mouse.current?.x ?? 0;
    const my = mouse.current?.y ?? 0;
    pts.rotation.y += (mx * 0.5 + Math.sin(t * 0.12) * 0.18 - pts.rotation.y) * 0.05;
    pts.rotation.x += (-my * 0.3 - pts.rotation.x) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[initial, 3]}
          count={COUNT}
          array={initial}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#1A1A1A"
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0.82}
        depthWrite={false}
      />
    </points>
  );
}

export default function InkParticleMorph() {
  const [mounted, setMounted] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [forms, setForms] = useState<Float32Array[] | null>(null);
  const [index, setIndex] = useState(0);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl2") || c.getContext("webgl"))) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  // 栅格化所有形（客户端，挂载后）
  useEffect(() => {
    if (!mounted || !hasWebGL) return;
    setForms(FORMS.map((f) => sampleText(f)));
  }, [mounted, hasWebGL]);

  // 自动轮播 + 点击立即切换
  useEffect(() => {
    if (!forms) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % FORMS.length), 4500);
    return () => clearInterval(id);
  }, [forms]);

  const advance = () => setIndex((i) => (i + 1) % FORMS.length);

  const onPointerMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouse.current = {
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
    };
  };

  return (
    <section id="versions" className="py-32 px-6 scroll-mt-20">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          不同版本的我 / VERSIONS OF ME
        </h2>
        <p className="font-serif text-sm text-muted mb-10 text-center leading-relaxed">
          同一把料，不断长成不同的我——点一下，换一个。
        </p>

        <div
          onClick={advance}
          onPointerMove={onPointerMove}
          className="relative w-full h-[440px] sm:h-[520px] mx-auto cursor-pointer select-none rounded-sm border border-line bg-ink/[0.015] overflow-hidden"
          role="button"
          aria-label="不同版本的我，点击切换"
        >
          {mounted && hasWebGL && forms ? (
            <Canvas
              style={{ background: "transparent" }}
              camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
              dpr={[1, 2]}
            >
              <ParticleField forms={forms} index={index} mouse={mouse} />
            </Canvas>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-4xl text-ink">{FORMS[index]}</span>
            </div>
          )}
        </div>

        <p className="font-sans text-xs text-muted/70 mt-4 text-center tracking-wide tabular-nums">
          {index + 1} / {FORMS.length} · 点一下换下一个我
        </p>
      </div>
    </section>
  );
}
