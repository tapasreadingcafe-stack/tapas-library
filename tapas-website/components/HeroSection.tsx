export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden pb-space-4xl pt-space-3xl"
      style={{
        background: "linear-gradient(180deg, var(--surface-dim) 0%, var(--surface) 100%)",
      }}
    >
      <div className="mx-auto max-w-content px-[var(--content-padding)]">
        <div className="flex items-start justify-between gap-12">
          {/* Left — Greeting */}
          <div className="max-w-2xl">
            <p className="mb-3 font-body text-label-sm font-semibold uppercase tracking-[0.15em] text-on-surface-variant">
              The Reader&rsquo;s Sanctuary Dashboard
            </p>
            <h1 className="font-display text-display-lg font-bold leading-[1.05] tracking-[-0.02em] text-primary">
              Welcome back,
              <br />
              <span className="italic">Evelyn.</span>
            </h1>
          </div>

          {/* Right — Membership badge */}
          <div
            className="relative mt-4 flex-shrink-0 rounded-lg px-8 py-5"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
              boxShadow: "inset 0 0 0 3px rgba(251,251,226,0.12), inset 0 0 0 5px rgba(251,251,226,0.06)",
            }}
          >
            <p className="mb-1 font-body text-label-sm font-medium uppercase tracking-[0.12em] text-on-primary/60">
              Membership Tier
            </p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <p className="font-display text-headline-md font-bold text-on-primary">
                Master Curator
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
