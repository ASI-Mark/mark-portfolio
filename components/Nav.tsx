const NAV_ITEMS = [
  { href: "#hero", label: "门面" },
  { href: "#works", label: "作品" },
  { href: "#creations", label: "造物" },
  { href: "#mind", label: "思想" },
  { href: "#timeline", label: "底色" },
  { href: "#map", label: "足迹" },
  { href: "#recent", label: "生长" },
  { href: "#guestbook", label: "留言" },
];

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-bg/70 border-b border-line">
      {/* first:ml-auto/last:mr-auto centers when there's room but, unlike
          justify-center, keeps the leading items reachable when the row
          overflows and scrolls */}
      <div className="max-w-prose mx-auto px-6 py-4 flex gap-8 text-sm font-sans text-muted overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="hover:text-ink transition-colors tracking-widest whitespace-nowrap shrink-0 first:ml-auto last:mr-auto"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
