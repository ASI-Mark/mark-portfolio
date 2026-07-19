"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import cities from "@/content/cities.json";
import { CHINA_PROVINCES } from "@/lib/china-map-data";

interface City {
  name: string;
  lat: number;
  lng: number;
  label: string;
  photoFolder: string;
  photoCount: number;
}

// Same projection as the SVG province paths (lng 73-135, lat 18-54 → 800x680)
const W = 800;
const H = 680;
function project(lat: number, lng: number) {
  const x = ((lng - 73) / (135 - 73)) * W;
  const y = ((54 - lat) / (54 - 18)) * H;
  return { x, y };
}

// Which provinces Mark has visited (for highlight)
const VISITED_PROVINCES = [
  "陕西省", "河南省", "山西省", "上海市", "福建省",
  "浙江省", "贵州省", "广东省", "北京市", "河北省", "湖北省",
];

// Province name labels with approximate screen coordinates
const PROVINCE_LABELS: { name: string; x: number; y: number }[] = [
  { name: "新疆", x: 170, y: 160 },
  { name: "西藏", x: 165, y: 340 },
  { name: "内蒙古", x: 400, y: 110 },
  { name: "青海", x: 230, y: 270 },
  { name: "四川", x: 300, y: 370 },
  { name: "云南", x: 280, y: 470 },
  { name: "广西", x: 370, y: 490 },
  { name: "广东", x: 420, y: 490 },
  { name: "湖南", x: 400, y: 420 },
  { name: "湖北", x: 410, y: 370 },
  { name: "河南", x: 430, y: 330 },
  { name: "山东", x: 480, y: 290 },
  { name: "河北", x: 460, y: 240 },
  { name: "陕西", x: 370, y: 310 },
  { name: "甘肃", x: 290, y: 240 },
  { name: "黑龙江", x: 560, y: 80 },
  { name: "吉林", x: 560, y: 140 },
  { name: "辽宁", x: 530, y: 190 },
  { name: "江苏", x: 500, y: 350 },
  { name: "浙江", x: 510, y: 390 },
  { name: "福建", x: 480, y: 440 },
  { name: "江西", x: 450, y: 420 },
  { name: "安徽", x: 470, y: 360 },
  { name: "山西", x: 420, y: 280 },
  { name: "贵州", x: 340, y: 440 },
  { name: "海南", x: 390, y: 560 },
  { name: "台湾", x: 530, y: 470 },
];

// Map short province label names to full province names for visited check
const PROVINCE_LABEL_TO_FULL: Record<string, string> = {
  "陕西": "陕西省", "河南": "河南省", "山西": "山西省", "上海": "上海市",
  "福建": "福建省", "浙江": "浙江省", "贵州": "贵州省", "广东": "广东省",
  "北京": "北京市", "河北": "河北省", "湖北": "湖北省",
};

// SVG viewBox used for the map: x=80, y=-20, width=W-100, height=H+20
const VIEW_X = 80;
const VIEW_Y = -20;
const VIEW_W = W - 100;
const VIEW_H = H + 20;

export default function ChinaMap() {
  const [selected, setSelected] = useState<City | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [drawn, setDrawn] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // 滚动进视口时触发"钢笔描边"入场（一次性）。reduced-motion 直接显示终态。
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const selectCity = useCallback((city: City) => {
    setSelected(city);
    setPhotoIndex(0);
  }, []);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight" && selected) {
        setPhotoIndex((i) => Math.min(selected.photoCount - 1, i + 1));
      }
      if (e.key === "ArrowLeft" && selected) {
        setPhotoIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const typedCities = cities as City[];

  // Memoize projected city positions (in SVG viewBox coords)
  const cityPositions = useMemo(
    () => typedCities.map((c) => ({ ...c, pos: project(c.lat, c.lng) })),
    [typedCities]
  );

  // Preload the first photo of each city so the gallery opens instantly
  // when the user clicks a city dot.
  useEffect(() => {
    if (!mounted) return;
    typedCities.forEach((c) => {
      if (c.photoCount === 0) return; // no photo to preload yet
      const img = document.createElement("img");
      img.src = `/cities/${c.name}_1.jpg`;
    });
  }, [mounted, typedCities]);

  return (
    <>
      <section ref={sectionRef} id="map" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
            我走过的地方 / FOOTPRINTS
          </h2>
          <p className="font-serif text-sm text-muted text-center mb-12">
            20 个城市，11 个省份
          </p>

          {/* 钢笔线稿地图：墨线省界描边入场 + 暗红城市点，铺在纸面上 */}
          <div ref={mapRef} className="relative w-full">
            <svg
              viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
              className="w-full h-auto block"
            >
              {/* 省界：墨线，去过的省填极淡暗红。pathLength=1 让描边入场匀速。 */}
              {CHINA_PROVINCES.map((prov, i) => {
                const isVisited = VISITED_PROVINCES.includes(prov.name);
                return (
                  <path
                    key={prov.name}
                    d={prov.path}
                    pathLength={1}
                    fill={isVisited ? "rgba(139, 46, 46, 0.05)" : "transparent"}
                    stroke={
                      isVisited ? "rgba(139, 46, 46, 0.55)" : "rgba(26, 26, 26, 0.28)"
                    }
                    strokeWidth={isVisited ? "0.7" : "0.5"}
                    strokeLinejoin="round"
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: drawn ? 0 : 1,
                      transition: `stroke-dashoffset 1.4s ease ${i * 0.02}s, fill 0.8s ease ${1 + i * 0.01}s`,
                    }}
                  />
                );
              })}

              {/* 省名：极淡墨字 */}
              {PROVINCE_LABELS.map((label) => {
                const fullName = PROVINCE_LABEL_TO_FULL[label.name];
                const isVisited = fullName ? VISITED_PROVINCES.includes(fullName) : false;
                return (
                  <text
                    key={label.name}
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    fill="#1A1A1A"
                    opacity={drawn ? (isVisited ? 0.34 : 0.16) : 0}
                    fontSize={label.name.length > 2 ? "7" : "8"}
                    fontFamily="var(--font-sans)"
                    className="pointer-events-none select-none"
                    style={{
                      letterSpacing: "0.15em",
                      transition: "opacity 0.8s ease 1.1s",
                    }}
                  >
                    {label.name}
                  </text>
                );
              })}

              {/* 游线：城市间极淡墨虚线 */}
              {mounted &&
                [
                  ["宝鸡", "西安"], ["西安", "华山"], ["西安", "汉中"],
                  ["晋城", "运城"], ["漳州", "厦门"],
                  ["惠州", "深圳"], ["惠州", "清远"], ["惠州", "河源"],
                  ["北京", "秦皇岛"],
                ].map(([from, to], i) => {
                  const a = cityPositions.find((c) => c.name === from);
                  const b = cityPositions.find((c) => c.name === to);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={i}
                      x1={a.pos.x} y1={a.pos.y}
                      x2={b.pos.x} y2={b.pos.y}
                      stroke="rgba(139, 46, 46, 0.18)"
                      strokeWidth="0.5"
                      strokeDasharray="2 3"
                      opacity={drawn ? 1 : 0}
                      style={{ transition: "opacity 0.8s ease 1.3s" }}
                    />
                  );
                })}

              {/* 城市点：暗红实心点，hover 放大并显名 */}
              {mounted &&
                cityPositions.map((city, idx) => {
                  const isBeijing = city.name === "北京";
                  const isHovered = hoveredCity === city.name;
                  const r = isBeijing ? 3.4 : 2.4;
                  return (
                    <g
                      key={city.name}
                      opacity={drawn ? 1 : 0}
                      style={{
                        transition: `opacity 0.5s ease ${1.4 + idx * 0.03}s`,
                      }}
                    >
                      {/* hover 光晕（暗红极淡） */}
                      <circle
                        cx={city.pos.x} cy={city.pos.y}
                        r={isHovered ? r * 3 : 0}
                        fill="rgba(139, 46, 46, 0.12)"
                        className="transition-all duration-300 pointer-events-none"
                      />
                      <circle
                        cx={city.pos.x} cy={city.pos.y}
                        r={isHovered ? r * 1.5 : r}
                        fill="#8B2E2E"
                        className="transition-all duration-300"
                        onClick={() => selectCity(city)}
                        onMouseEnter={() => setHoveredCity(city.name)}
                        onMouseLeave={() => setHoveredCity(null)}
                        style={{ cursor: "pointer" }}
                      />
                      <text
                        x={city.pos.x}
                        y={city.pos.y - (isBeijing ? 8 : 6)}
                        textAnchor="middle"
                        fill="#1A1A1A"
                        fontSize={isBeijing ? "8" : "7"}
                        fontFamily="var(--font-sans)"
                        className="transition-opacity duration-300 pointer-events-none select-none"
                        opacity={isHovered || isBeijing ? 0.85 : 0}
                      >
                        {city.name}
                        {isBeijing && (
                          <tspan fontSize="6" opacity="0.55" dx="3">&#8592; 在这里</tspan>
                        )}
                      </text>
                    </g>
                  );
                })}
            </svg>

            {/* 底注 */}
            <div className="flex items-center justify-between mt-6 px-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(139, 46, 46, 0.14)", border: "1px solid rgba(139, 46, 46, 0.4)" }} />
                  <span className="font-sans text-[10px] text-muted tracking-wide">去过的省份</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B2E2E" }} />
                  <span className="font-sans text-[10px] text-muted tracking-wide">城市</span>
                </div>
              </div>
              <p className="font-sans text-[11px] text-muted/70 tracking-[0.15em]">
                20 CITIES &middot; 11 PROVINCES
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Modal with Gallery */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(24, 20, 16, 0.9)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeUp 0.3s ease-out" }}
          >
            {/* Photo with subtle border */}
            <div
              className="rounded-lg overflow-hidden relative"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            >
              {selected.photoCount > 0 ? (
                <Image
                  src={`/cities/${selected.name}_${photoIndex + 1}.jpg`}
                  alt={`${selected.name} - ${selected.label}`}
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: "55vh" }}
                />
              ) : (
                // No photos yet for this city — show a placeholder instead of
                // a broken image (see content/cities.json photoCount: 0).
                <div
                  className="w-full flex items-center justify-center"
                  style={{
                    aspectRatio: "4 / 3",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    letterSpacing: "0.15em",
                  }}
                >
                  照片待补
                </div>
              )}

              {/* Gallery navigation overlay */}
              {selected.photoCount > 1 && (
                <>
                  {/* Left arrow */}
                  {photoIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.8)", fontSize: "16px", cursor: "pointer",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      &#8249;
                    </button>
                  )}

                  {/* Right arrow */}
                  {photoIndex < selected.photoCount - 1 && (
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((i) => Math.min(selected.photoCount - 1, i + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.8)", fontSize: "16px", cursor: "pointer",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      &#8250;
                    </button>
                  )}

                  {/* Photo counter */}
                  <div
                    className="absolute bottom-3 left-1/2 -translate-x-1/2"
                    style={{
                      background: "rgba(0,0,0,0.5)", borderRadius: 12,
                      padding: "3px 10px", backdropFilter: "blur(4px)",
                      fontSize: "11px", color: "rgba(255,255,255,0.7)",
                      fontFamily: "var(--font-sans)", letterSpacing: "0.1em",
                    }}
                  >
                    {photoIndex + 1} / {selected.photoCount}
                  </div>
                </>
              )}
            </div>

            {/* Info below */}
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-serif)" }}>
                  {selected.name}
                </p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-sans)", letterSpacing: "0.1em", marginTop: 4 }}>
                  {selected.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", fontFamily: "var(--font-sans)", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
              >
                ESC &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
