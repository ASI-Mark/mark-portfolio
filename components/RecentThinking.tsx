import recentContent from "@/content/recent.json";
import type { RecentContent } from "@/lib/types";

const content = recentContent as RecentContent;

export default function RecentThinking() {
  return (
    <section id="recent" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          最近在想 / RECENT
        </h2>
        <p className="font-serif text-sm text-muted mb-16 text-center">
          从日志和 flomo 里，最近反复在想的几件事
        </p>

        <ul className="space-y-12">
          {content.items.map((item, i) => (
            <li key={i} className="border-t border-line pt-6">
              <div className="font-sans text-xs text-muted tracking-wide mb-3">
                {item.date} · {item.source}
              </div>
              <div className="font-serif text-base text-ink leading-loose space-y-4">
                {item.text.split("\n\n").map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-24 font-sans text-xs text-muted text-center tracking-wide">
          这个板块会持续更新。下次见面时，可能你会看到不一样的我。
        </p>
      </div>
    </section>
  );
}
