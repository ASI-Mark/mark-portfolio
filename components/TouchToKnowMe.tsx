"use client";

import { useMemo, useState } from "react";

/**
 * 「碰一碰，认识我」——可玩小实验
 * 散落的碎片 = 一个人被打散的原料（身份/作品/信条/足迹）。
 * 碰一下中间的「我」，碎片朝中心聚拢、坍缩，随后一句"我"浮出。
 * 再碰一下，散开。呼应 thoughtPiece：碰一碰，还能知道我是谁。
 */

// 公开可见的碎片——只放对外安全的（身份/作品/信条/足迹），不含健康等敏感项
const FRAGMENTS = [
  "足球教练", "体育老师", "抖音2万粉", "惠州工作室",
  "清华易洋", "月GMV100万", "猿辅导", "飞象老师",
  "coach 教练", "选题雷达", "1852条记忆", "记账管家",
  "求职追踪", "灵犀", "2338篇笔记", "严父慈母",
  "视角", "梯子", "钉子", "扎好马步",
  "走过10省", "用 AI 造东西", "碰一碰", "下一个我",
];

const COLS = 4;

// 确定性伪随机（Math.sin 抖动），避免 SSR/CSR 水合错位
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Frag {
  text: string;
  x: number; // 散开态位置 %（相对卡片）
  y: number;
  rot: number; // 旋转 deg
  scale: number;
  opacity: number;
}

export default function TouchToKnowMe() {
  const [gathered, setGathered] = useState(false);

  const frags = useMemo<Frag[]>(() => {
    const rows = Math.ceil(FRAGMENTS.length / COLS);
    return FRAGMENTS.map((text, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      // 网格 + 抖动铺满卡片（留边）
      const baseX = 14 + (col / (COLS - 1)) * 72;
      const baseY = 12 + (row / (rows - 1)) * 76;
      const x = baseX + (seeded(i, 1) - 0.5) * 12;
      const y = baseY + (seeded(i, 2) - 0.5) * 8;
      const rot = (seeded(i, 3) - 0.5) * 22;
      const scale = 0.9 + seeded(i, 4) * 0.35;
      const opacity = 0.4 + seeded(i, 5) * 0.4;
      return { text, x, y, rot, scale, opacity };
    });
  }, []);

  return (
    <section className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          碰一碰，认识我 / TOUCH TO KNOW ME
        </h2>
        <p className="font-serif text-sm text-muted mb-10 text-center leading-relaxed">
          我不想墓碑上只有两个字——碰一下中间的「我」。
        </p>

        <div
          onClick={() => setGathered((g) => !g)}
          className="relative w-full h-[440px] sm:h-[500px] mx-auto cursor-pointer select-none rounded-sm border border-line bg-ink/[0.015] overflow-hidden"
          role="button"
          aria-label="碰一碰，认识我"
          aria-pressed={gathered}
        >
          {/* 碎片层 */}
          {frags.map((f, i) => (
            <span
              key={i}
              className="absolute font-serif text-ink whitespace-nowrap pointer-events-none will-change-transform text-sm sm:text-base"
              style={{
                left: `${gathered ? 50 : f.x}%`,
                top: `${gathered ? 50 : f.y}%`,
                transform: `translate(-50%, -50%) rotate(${
                  gathered ? 0 : f.rot
                }deg) scale(${gathered ? 0.2 : f.scale})`,
                opacity: gathered ? 0 : f.opacity,
                transition:
                  "left 0.7s cubic-bezier(0.22,1,0.36,1), top 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease-out",
                transitionDelay: `${(gathered ? i : frags.length - i) * 14}ms`,
              }}
            >
              {f.text}
            </span>
          ))}

          {/* 中心「我」按钮 */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              transition: "opacity 0.4s ease-out",
              opacity: gathered ? 0 : 1,
            }}
          >
            <span
              className="absolute inset-0 rounded-full border border-accent/40"
              style={{ animation: "kmGlow 2.4s ease-in-out infinite" }}
            />
            <span className="font-serif text-2xl text-accent">我</span>
          </div>

          {/* 聚合后的一句"我" */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center pointer-events-none"
            style={{
              transition: "opacity 0.6s ease-out",
              transitionDelay: gathered ? "0.35s" : "0s",
              opacity: gathered ? 1 : 0,
            }}
          >
            <p className="font-serif text-xl sm:text-2xl text-ink leading-relaxed mb-4">
              碰一碰，你就认识我了
            </p>
            <p className="font-serif text-sm text-muted leading-relaxed max-w-sm">
              身份、作品、信条、足迹——散落的每一块，拼起来，是一个正在被
              AI 一件件系统化的我。
            </p>
          </div>
        </div>

        <p className="font-sans text-xs text-muted/70 mt-4 text-center tracking-wide">
          {gathered ? "再碰一下，让它们散开" : "碰一下中间的「我」"}
        </p>
      </div>
    </section>
  );
}
