"use client";

import { useState } from "react";
import creationsContent from "@/content/creations.json";

interface CreationItem {
  id: string;
  date: string;
  status: "run" | "paused" | "retired";
  name: string;
  tagline: string;
  detail: string;
}

const content = creationsContent as {
  intro: string;
  items: CreationItem[];
};

const STATUS_LABEL: Record<CreationItem["status"], string> = {
  run: "在跑",
  paused: "搁置",
  retired: "退役",
};

function StatusDot({ status }: { status: CreationItem["status"] }) {
  const cls =
    status === "run"
      ? "bg-accent"
      : status === "paused"
        ? "bg-muted/60"
        : "bg-ink/70";
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full ${cls}`} />
      <span className="font-sans text-xs text-muted tracking-wide">
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}

export default function Creations() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id="creations" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          我造的东西 / CREATIONS
        </h2>
        <p className="font-serif text-lg text-ink mb-16 leading-relaxed text-center">
          {content.intro}
        </p>

        <div className="border-t border-line">
          {content.items.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="group block w-full text-left py-5 px-2 hover:bg-ink/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="w-14 shrink-0 font-sans text-xs text-muted tracking-widest">
                      {item.date}
                    </span>
                    <StatusDot status={item.status} />
                    <span className="font-serif text-ink font-medium shrink-0">
                      {item.name}
                    </span>
                    <span className="font-serif text-sm text-muted leading-relaxed min-w-0 hidden sm:block">
                      {item.tagline}
                    </span>
                  </div>
                  <p className="font-serif text-sm text-muted leading-relaxed mt-1.5 pl-[4.5rem] sm:hidden">
                    {item.tagline}
                  </p>
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: open ? "10rem" : "0",
                    opacity: open ? 1 : 0,
                  }}
                >
                  <div className="pb-6 px-2 pl-[4.5rem]">
                    <p className="font-serif text-sm text-ink/85 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
