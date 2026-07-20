import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Beliefs() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-prose mx-auto w-full">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-16 text-center">
          我相信什么 / BELIEFS
        </h2>
        <div className="space-y-20">
          {content.beliefs.map((b, i) => (
            <blockquote
              key={i}
              className="font-serif text-2xl md:text-3xl text-ink text-center leading-relaxed"
            >
              {b.text}
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
