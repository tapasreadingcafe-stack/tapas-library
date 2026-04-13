export default function Navbar() {
  const links = [
    { label: "Home", href: "#" },
    { label: "Library", href: "#" },
    { label: "Shop", href: "#" },
    { label: "Membership", href: "#" },
    { label: "Sanctuary", href: "#", active: true },
  ];

  return (
    <nav className="bg-primary">
      <div className="mx-auto flex max-w-content items-center justify-between px-[var(--content-padding)] py-4">
        {/* Logo */}
        <a href="#" className="font-display text-xl italic text-on-primary tracking-tight">
          Tapas Reading Cafe
        </a>

        {/* Center links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`font-body text-sm font-medium transition-colors duration-[var(--transition-base)] ${
                link.active
                  ? "text-on-primary border-b-2 border-secondary pb-0.5"
                  : "text-on-primary/70 hover:text-on-primary"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="rounded-md bg-on-primary px-5 py-2 font-body text-xs font-semibold uppercase tracking-widest text-primary transition-opacity hover:opacity-90"
          >
            Join the Circle
          </a>
          {/* Avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
            <span className="font-body text-xs font-semibold text-on-primary">E</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
