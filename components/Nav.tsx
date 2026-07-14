const NAV_ITEMS = [
  { href: "#hero", label: "门面" },
  { href: "#works", label: "作品" },
  { href: "#mind", label: "思想" },
  { href: "#timeline", label: "底色" },
  { href: "#map", label: "足迹" },
  { href: "#recent", label: "生长" },
  { href: "#guestbook", label: "留言" },
];

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-bg/70 border-b border-line">
      <div className="max-w-prose mx-auto px-6 py-4 flex justify-center gap-8 text-sm font-sans text-muted overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="hover:text-ink transition-colors tracking-widest whitespace-nowrap shrink-0"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
