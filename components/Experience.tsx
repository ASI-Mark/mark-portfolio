"use client";

import { useState } from "react";
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";
import ProjectDetail from "@/components/ProjectDetail";

const content = staticContent as StaticContent;

export default function Experience() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const projects = content.experience;
  const total = projects.length;

  return (
    <>
      <section id="works" className="py-32 px-6">
        <div className="max-w-prose mx-auto">
          <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4">
            我做过什么 / EXPERIENCE
          </h2>
          <p className="font-serif text-lg text-ink mb-16 leading-relaxed">
            这两年，从一个人到带一支团队。
          </p>

          <div className="border-t border-line">
            {projects.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                className="group block w-full text-left border-b border-line py-6 px-2 hover:bg-ink/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 shrink-0 font-sans text-xs text-muted tracking-widest pt-1">
                    {p.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-xs text-muted tracking-wide">
                      {p.period}
                    </div>
                    <div className="font-serif text-lg text-ink mt-1 group-hover:text-accent transition-colors">
                      {p.title}
                    </div>
                    <div className="font-sans text-xs text-muted mt-1 tracking-wide">
                      {p.summary}
                    </div>
                  </div>
                  <div className="font-sans text-xs text-muted group-hover:text-accent transition-colors shrink-0 pt-1">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeIdx !== null && (
        <ProjectDetail
          project={projects[activeIdx]}
          index={activeIdx}
          total={total}
          onClose={() => setActiveIdx(null)}
          onPrev={() =>
            setActiveIdx((i) => (i !== null && i > 0 ? i - 1 : i))
          }
          onNext={() =>
            setActiveIdx((i) => (i !== null && i < total - 1 ? i + 1 : i))
          }
        />
      )}
    </>
  );
}
