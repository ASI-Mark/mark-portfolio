"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import cities from "@/content/cities.json";

interface City {
  name: string;
  lat: number;
  lng: number;
  label: string;
  photoFolder: string;
  photoCount: number;
}

const list = cities as City[];

// 翻页式旅行手记：一次一整页（一个城市），点翻页显示完整下一页。
// 照片是主角（经历的体现），不再让抽象地图扛分量。
export default function FootprintJournal() {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const city = list[idx];
  const total = list.length;

  const go = useCallback(
    (delta: number) => {
      setLightbox(null);
      setIdx((i) => {
        const next = Math.max(0, Math.min(total - 1, i + delta));
        return next;
      });
    },
    [total]
  );

  // 翻页后把这一页顶部对齐到视口，保证"点下一页显示完整一页"
  useEffect(() => {
    if (pageRef.current) {
      pageRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [idx]);

  // 键盘：左右翻页 / Esc 关灯箱
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightbox !== null) {
        if (e.key === "Escape") setLightbox(null);
        if (e.key === "ArrowRight" && city.photoCount > 0)
          setLightbox((p) => (p === null ? 0 : Math.min(city.photoCount - 1, p + 1)));
        if (e.key === "ArrowLeft" && city.photoCount > 0)
          setLightbox((p) => (p === null ? 0 : Math.max(0, p - 1)));
        return;
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, lightbox, city.photoCount]);

  // 预加载相邻城市首图，翻页不闪
  useEffect(() => {
    [idx - 1, idx + 1].forEach((n) => {
      const c = list[n];
      if (c && c.photoCount > 0) {
        const img = document.createElement("img");
        img.src = `/cities/${c.name}_1.jpg`;
      }
    });
  }, [idx]);

  const photos = Array.from({ length: city.photoCount }, (_, i) => i + 1);

  return (
    <section ref={sectionRef} id="map" className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          我走过的地方 / FOOTPRINTS
        </h2>
        <p className="font-serif text-sm text-muted text-center mb-14">
          20 个城市，11 个省份
        </p>

        {/* 一页 = 一个城市 */}
        <div ref={pageRef} className="scroll-mt-24">
          {/* 页眉：城市名 · 标签 · 页码 */}
          <div className="flex items-baseline justify-between mb-6 border-b border-line pb-4">
            <div className="flex items-baseline gap-3 min-w-0">
              <h3 className="font-serif text-3xl md:text-4xl text-ink shrink-0">
                {city.name}
              </h3>
              <span className="font-serif text-sm text-muted truncate">
                {city.label}
              </span>
            </div>
            <span className="font-sans text-xs text-muted tracking-widest shrink-0 tabular-nums">
              {String(idx + 1).padStart(2, "0")} / {total}
            </span>
          </div>

          {/* 照片：横向胶片条，高度有界，每页完整 */}
          {city.photoCount > 0 ? (
            <div
              className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory"
              style={{ scrollbarWidth: "thin" }}
            >
              {photos.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLightbox(n - 1)}
                  className="group relative shrink-0 snap-start overflow-hidden bg-ink/[0.03] cursor-pointer"
                  style={{
                    width: "min(78vw, 340px)",
                    aspectRatio: "4 / 3",
                    border: "6px solid #fff",
                    boxShadow: "0 6px 20px rgba(26,26,26,0.10)",
                  }}
                  aria-label={`${city.name} 照片 ${n}`}
                >
                  <Image
                    src={`/cities/${city.name}_${n}.jpg`}
                    alt={`${city.name} · ${city.label}`}
                    fill
                    sizes="(max-width: 768px) 78vw, 340px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div
              className="w-full flex items-center justify-center text-muted font-sans tracking-widest"
              style={{
                aspectRatio: "16 / 7",
                background: "rgba(26,26,26,0.03)",
                fontSize: 13,
              }}
            >
              照片待补
            </div>
          )}

          {/* 翻页 */}
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={idx === 0}
              className="font-sans text-sm text-muted hover:text-ink transition-colors tracking-widest disabled:opacity-25 disabled:hover:text-muted cursor-pointer disabled:cursor-default"
            >
              ← 上一站
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={idx === total - 1}
              className="font-sans text-sm text-muted hover:text-ink transition-colors tracking-widest disabled:opacity-25 disabled:hover:text-muted cursor-pointer disabled:cursor-default"
            >
              下一站 →
            </button>
          </div>
        </div>

        {/* 城市索引：点名字直接跳到那一页 */}
        <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center mt-14">
          {list.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setIdx(i)}
              className={`font-sans text-xs tracking-wide transition-colors cursor-pointer ${
                i === idx ? "text-accent" : "text-muted/50 hover:text-muted"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 灯箱：点照片看大图 */}
      {lightbox !== null && city.photoCount > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(24, 20, 16, 0.9)", backdropFilter: "blur(12px)" }}
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-lg" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
              <Image
                src={`/cities/${city.name}_${lightbox + 1}.jpg`}
                alt={`${city.name} · ${city.label}`}
                width={1000}
                height={750}
                className="w-full h-auto object-cover"
                style={{ maxHeight: "72vh" }}
              />
              {city.photoCount > 1 && (
                <>
                  {lightbox > 0 && (
                    <button
                      type="button"
                      onClick={() => setLightbox((p) => Math.max(0, (p ?? 0) - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full"
                      style={{ width: 36, height: 36, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 16 }}
                    >
                      ‹
                    </button>
                  )}
                  {lightbox < city.photoCount - 1 && (
                    <button
                      type="button"
                      onClick={() => setLightbox((p) => Math.min(city.photoCount - 1, (p ?? 0) + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full"
                      style={{ width: 36, height: 36, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 16 }}
                    >
                      ›
                    </button>
                  )}
                  <div
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full font-sans tracking-widest"
                    style={{ background: "rgba(0,0,0,0.5)", padding: "3px 10px", fontSize: 11, color: "rgba(255,255,255,0.75)" }}
                  >
                    {lightbox + 1} / {city.photoCount}
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="font-serif text-lg text-white/90">{city.name}</p>
                <p className="font-sans text-xs text-white/40 tracking-wide mt-1">{city.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="font-sans text-xs text-white/30 hover:text-white/70 tracking-widest cursor-pointer"
              >
                ESC ×
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
