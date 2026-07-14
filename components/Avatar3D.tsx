"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { useAvatarState, type Animation } from "./useAvatarState";
import * as THREE from "three";
import AvatarCompanion from "./AvatarCompanion";

// Map state machine names → GLB animation names
const ANIM_MAP: Record<Animation, string> = {
  idle: "idle",
  walk: "walk",
  wave: "wave",
  sit: "sit",
  sleep: "sleep",
  jump: "jump",
  dance: "dance",
  silly: "silly",
  robot: "robot",
  freeze: "freeze",
  thinking: "thinking",
  bored: "bored",
  excited: "excited",
  happy: "happy",
};

// One-shot animations: play through once then hold the final frame.
// Used for short gestures so sequence transitions look natural.
const ONE_SHOT_ANIMATIONS = new Set([
  "wave", "jump", "excited", "happy", "bored", "thinking", "freeze",
]);

// Per-animation Y rotation offset — "walk" was downloaded With Skin facing
// camera; all other Without-Skin exports end up 180° flipped after merge.
const Y_ROT_OFFSET: Record<Animation, number> = {
  walk: 0,
  idle: Math.PI,
  wave: Math.PI,
  sit: Math.PI,
  sleep: Math.PI,
  jump: Math.PI,
  dance: Math.PI,
  silly: Math.PI,
  robot: Math.PI,
  freeze: Math.PI,
  thinking: Math.PI,
  bored: Math.PI,
  excited: Math.PI,
  happy: Math.PI,
};


function AstronautModel({
  animation,
  posX,
  posY,
  facingLeft,
  onAvatarClick,
  showBubble,
}: {
  animation: Animation;
  posX: number;
  posY: number;
  facingLeft: boolean;
  onAvatarClick: () => void;
  showBubble: boolean;
}) {
  const { scene, animations } = useGLTF("/astronaut-ai.glb", true, true);
  const group = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const rotRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const { actions } = useAnimations(animations, modelRef);

  // Enhance materials
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.55;
        mat.metalness = 0.05;
        mat.needsUpdate = true;
      }
    });
  }, [scene]);

  // Switch animation based on state
  useEffect(() => {
    const targetName = ANIM_MAP[animation];
    const target = actions[targetName];
    if (!target) {
      console.warn(`[Avatar3D] Animation "${targetName}" not found. Available:`, Object.keys(actions));
      return;
    }

    // Fade out all others, fade in target
    Object.entries(actions).forEach(([name, a]) => {
      if (!a) return;
      if (name === targetName) {
        a.reset().fadeIn(0.3).play();
        if (ONE_SHOT_ANIMATIONS.has(animation)) {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
        } else {
          a.setLoop(THREE.LoopRepeat, Infinity);
        }
      } else {
        a.fadeOut(0.3);
      }
    });
  }, [animation, actions]);

  useFrame(() => {
    if (!group.current || !modelRef.current) return;

    // Position lerp toward mouse
    const worldX = (posX / window.innerWidth - 0.5) * viewport.width;
    const worldY = -(posY / window.innerHeight - 0.5) * viewport.height;
    group.current.position.x += (worldX - group.current.position.x) * 0.1;
    group.current.position.y += (worldY - group.current.position.y) * 0.1;

    // Facing: scaleX flip for walk direction
    const targetScaleX = facingLeft ? -1 : 1;
    group.current.scale.x += (targetScaleX - group.current.scale.x) * 0.12;

    // Per-animation Y rotation offset (handles walk vs idle/sit/sleep facing)
    if (rotRef.current) {
      const target = Y_ROT_OFFSET[animation] ?? 0;
      let diff = target - rotRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rotRef.current.rotation.y += diff * 0.12;
    }


    // Ground shadow fade based on animation state
    if (shadowRef.current) {
      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = animation === "sleep" ? 0.15 : animation === "sit" ? 0.2 : 0.28;
      mat.opacity += (targetOpacity - mat.opacity) * 0.1;
    }
  });

  return (
    <group ref={group}>
      {/* Ground shadow */}
      <mesh
        ref={shadowRef}
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>

      {/* The rigged model — outer group handles animations, inner group rotates to face camera */}
      <group ref={modelRef}>
        <group ref={rotRef}>
          <primitive
            object={scene}
            scale={1.2}
            position={[0, 0, 0]}
            onClick={(e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              onAvatarClick();
            }}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          />
        </group>
      </group>

      {/* Speech bubble */}
      {showBubble && animation !== "sleep" && (
        <Html position={[0, 1.8, 0]} center>
          <div
            className="pointer-events-none whitespace-nowrap"
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
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload("/astronaut-ai.glb", true, true);

interface Avatar3DProps {
  onChatOpen: () => void;
  chatOpen: boolean;
}

export default function Avatar3D({ onChatOpen, chatOpen }: Avatar3DProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [showBubble, setShowBubble] = useState(true);
  const [externallyPaused, setExternallyPaused] = useState(false);

  // Other components can pause the avatar (e.g. Hero flashlight interaction)
  useEffect(() => {
    const onPause = () => setExternallyPaused(true);
    const onResume = () => setExternallyPaused(false);
    window.addEventListener("avatar:pause", onPause);
    window.addEventListener("avatar:resume", onResume);
    return () => {
      window.removeEventListener("avatar:pause", onPause);
      window.removeEventListener("avatar:resume", onResume);
    };
  }, []);

  // Small screens / touch devices: hide the floating avatar entirely rather
  // than showing the 3D model (or its 2D fallback) — not enough room, and
  // there's no mouse to chase anyway.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function update() {
      const touch =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(window.innerWidth < 768 || touch);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { animation, posX, posY, facingLeft, dimmed, onAvatarClick } = useAvatarState({
    onChatOpen,
    chatOpen,
    enabled: !chatOpen && !externallyPaused && !isMobile,
  });

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const [zoom, setZoom] = useState(120);
  useEffect(() => {
    const update = () => setZoom(window.innerWidth < 768 ? 80 : 120);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (isMobile) return null;
  if (chatOpen) return null;
  if (!hasWebGL) {
    return <AvatarCompanion onChatOpen={onChatOpen} chatOpen={chatOpen} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ opacity: dimmed ? 0.35 : 1, transition: "opacity 0.3s ease-out" }}
    >
      {/* Invisible click hit area that follows the avatar — this is how the
          avatar stays clickable while everything else on the page remains
          interactive (FloatingArrow, links, buttons, etc.) */}
      <div
        onClick={onAvatarClick}
        style={{
          position: "absolute",
          left: posX,
          top: posY,
          width: 140,
          height: 200,
          transform: "translate(-50%, -40%)",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      />
      <Suspense fallback={null}>
        <Canvas
          style={{ background: "transparent", pointerEvents: "none" }}
          gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          orthographic
          camera={{ zoom, position: [0, 0, 10], near: 0.1, far: 100 }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 4, 5]} intensity={1.8} />
          <directionalLight position={[0, 1, 5]} intensity={1.0} />
          <directionalLight position={[-3, 2, -3]} intensity={0.6} color="#cce0ff" />
          <directionalLight position={[0, -3, 2]} intensity={0.5} />
          <AstronautModel
            animation={animation}
            posX={posX}
            posY={posY}
            facingLeft={facingLeft}
            onAvatarClick={onAvatarClick}
            showBubble={showBubble}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
