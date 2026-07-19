import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Thoughts() {
  return (
    <section id="mind" className="min-h-screen flex flex-col justify-center py-24 px-6">
      <div className="max-w-prose mx-auto w-full">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-16 text-center">
          我怎么想事情 / MIND
        </h2>
        <div className="space-y-20">
          {content.thoughtPieces.map((t, i) => (
            <article key={i}>
              <h3 className="font-serif text-xl text-ink mb-6">
                {t.title}
              </h3>
              <p className="font-serif text-base text-ink leading-loose">
                {t.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
