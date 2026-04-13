export default function PreferredNook() {
  return (
    <section className="bg-surface py-space-4xl">
      <div className="mx-auto max-w-content px-[var(--content-padding)]">
        <div className="flex items-start justify-between gap-12">
          {/* Left — Booking suggestion */}
          <div className="max-w-xl">
            <div className="mb-5 flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h2 className="font-display text-headline-lg font-semibold text-primary">
                Your Preferred Nook
              </h2>
            </div>

            <p className="mb-6 font-body text-body-md leading-relaxed text-on-surface-variant">
              Based on your Tuesday habits, we&rsquo;ve anticipated your arrival.
              <br />
              The &ldquo;<span className="font-semibold italic text-on-surface">Oak Alcove</span>&rdquo; is available from 4:00 PM.
            </p>

            <div className="flex items-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-body text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, var(--secondary), var(--secondary-container))",
                }}
              >
                Confirm Booking
                <span className="text-base">→</span>
              </a>
              <a
                href="#"
                className="rounded-md border-[1.5px] border-primary bg-transparent px-6 py-3 font-body text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-on-primary"
              >
                See other options
              </a>
            </div>
          </div>

          {/* Right — Reading Streak card */}
          <div
            className="w-[260px] flex-shrink-0 rounded-lg bg-surface-container-lowest p-6"
            style={{ boxShadow: "inset 0 0 0 1.5px var(--surface-container-high)" }}
          >
            <h3 className="mb-4 font-display text-headline-sm font-semibold italic text-primary">
              The Reading Streak
            </h3>

            <div className="mb-5 flex items-baseline gap-3">
              <span className="font-display text-display-sm font-bold leading-none text-primary">
                14
              </span>
              <span className="font-body text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                Days Active
              </span>
            </div>

            {/* Decorative seal */}
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, var(--accent-warm-start), var(--accent-warm-end))",
              }}
            >
              <span className="font-display text-lg font-bold text-on-primary">✦</span>
            </div>

            <p className="mt-4 font-body text-label-sm leading-snug text-on-surface-variant">
              Next Reward: &ldquo;Barista&rsquo;s Secret Blend&rdquo; coupon in 3 days.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
