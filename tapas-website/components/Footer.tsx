export default function Footer() {
  const links = ["The Secret Menu", "Archives", "Privacy", "Lost & Found"];

  return (
    <footer className="bg-primary-container py-space-3xl">
      <div className="mx-auto max-w-content px-[var(--content-padding)] text-center">
        {/* Logo */}
        <p className="mb-6 font-display text-headline-md italic text-secondary">
          Tapas Reading Cafe
        </p>

        {/* Nav links */}
        <div className="mb-8 flex items-center justify-center gap-8">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="font-body text-label-sm font-semibold uppercase tracking-[0.12em] text-on-primary/70 transition-colors hover:text-on-primary"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="font-body text-label-sm text-on-primary/50">
          &copy; 2026 Tapas Reading Cafe. The Raconteur Moment. A quiet place for literary
          thoughts.
        </p>
      </div>
    </footer>
  );
}
