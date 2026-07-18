"use client";

import { useEffect, useState } from "react";

const SECTIONS = ["works", "creations", "beliefs", "mind", "timeline", "map", "recent", "guestbook"];

export default function FloatingArrow() {
  const [nextSection, setNextSection] = useState<string | null>("works");
  const [nearBottom, setNearBottom] = useState(false);

  useEffect(() => {
    function update() {
      const scrollY = window.scrollY;
      const viewH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      setNearBottom(scrollY + viewH > docH - 200);

      const center = scrollY + viewH * 0.6;
      let next: string | null = null;
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop > center) {
          next = id;
          break;
        }
      }
      if (!next) next = SECTIONS[0]; // fall back to first section on Hero
      setNextSection(next);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (nearBottom || !nextSection) return null;

  return (
    <a
      href={`#${nextSection}`}
      aria-label="继续向下"
      // Positioned bottom-right on desktop so it doesn't fight with the
      // centered flashlight in Hero; centered at bottom on small screens
      // where horizontal space is tight.
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] transition-all duration-500"
      style={{ opacity: 0.4 }}
    >
      <div
        className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm"
        style={{
          background: "rgba(26, 26, 26, 0.15)",
          border: "1px solid rgba(26, 26, 26, 0.08)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-ink animate-bounce"
          style={{ animationDuration: "2s" }}
        >
          <path
            d="M12 5v14M5 12l7 7 7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </a>
  );
}
