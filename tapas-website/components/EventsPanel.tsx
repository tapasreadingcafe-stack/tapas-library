const events = [
  {
    day: "24",
    month: "OCT",
    title: "Midnight Poetry & Malbec",
    description: "A private recital featuring the works of the Lost Generation.",
    ctaLabel: "Secure a Spot",
    ctaHref: "#",
  },
  {
    day: "02",
    month: "NOV",
    title: "The First Edition Gala",
    description: "Unveiling our 1920s collection with themed refreshments.",
    ctaLabel: "RSVP Private",
    ctaHref: "#",
  },
];

export default function EventsPanel() {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
        boxShadow: "inset 0 0 0 3px rgba(251,251,226,0.10), inset 0 0 0 5px rgba(251,251,226,0.05)",
      }}
    >
      <h3 className="mb-6 font-display text-headline-md font-semibold italic text-on-primary">
        Invitations for the Inner Circle
      </h3>

      <div className="flex flex-col gap-6">
        {events.map((event, i) => (
          <div key={i} className="flex gap-4">
            {/* Date */}
            <div className="flex-shrink-0 text-center">
              <p className="font-display text-display-sm font-bold leading-none text-on-primary">
                {event.day}
              </p>
              <p className="mt-0.5 font-body text-label-sm font-semibold uppercase tracking-wide text-on-primary/60">
                {event.month}
              </p>
            </div>

            {/* Details */}
            <div>
              <h4 className="font-display text-body-lg font-semibold text-on-primary">
                {event.title}
              </h4>
              <p className="mt-1 font-body text-body-sm leading-relaxed text-on-primary/70">
                {event.description}
              </p>
              <a
                href={event.ctaHref}
                className="mt-2 inline-block font-body text-label-sm font-bold uppercase tracking-wide text-secondary-fixed-dim transition-colors hover:text-secondary-fixed"
              >
                {event.ctaLabel}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
