import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-line">
      <div className="max-w-prose mx-auto text-center space-y-8">
        <blockquote className="font-serif text-base text-ink italic">
          &ldquo;{content.footer.quote}&rdquo;
        </blockquote>
        <div className="font-sans text-xs text-muted space-x-6">
          <span>微信 · {content.footer.contact.wechat}</span>
          <span>·</span>
          <span>{content.footer.contact.email}</span>
        </div>
        <div className="font-sans text-[10px] text-muted tracking-widest">
          马泽闰 · 2026 · 构建于 {new Date().toISOString().slice(0, 10)}
        </div>
      </div>
    </footer>
  );
}
