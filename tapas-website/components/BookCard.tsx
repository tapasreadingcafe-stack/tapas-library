interface BookCardProps {
  title: string;
  author: string;
  dueText: string;
  progressPercent: number;
  coverEmoji: string;
}

export default function BookCard({
  title,
  author,
  dueText,
  progressPercent,
  coverEmoji,
}: BookCardProps) {
  return (
    <div className="relative flex items-stretch gap-5 rounded-lg bg-surface-container-lowest py-5 pl-16 pr-5">
      {/* Book cover — overlapping left edge */}
      <div
        className="absolute -left-6 top-1/2 flex h-[120px] w-[85px] -translate-y-1/2 items-center justify-center rounded-md"
        style={{
          background: "linear-gradient(135deg, var(--primary-container), var(--primary))",
          boxShadow: "var(--shadow-ambient)",
        }}
      >
        <span className="text-3xl">{coverEmoji}</span>
      </div>

      {/* Book info */}
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div>
          <h4 className="font-display text-headline-sm font-semibold text-primary">
            {title}
          </h4>
          <p className="mt-0.5 font-body text-body-sm text-on-surface-variant">
            {author}
          </p>
        </div>

        <div>
          <p className="mb-2 font-body text-label-sm font-medium uppercase tracking-wide text-on-surface-variant">
            {dueText}
          </p>
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg, var(--accent-warm-start), var(--accent-warm-end))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Bookmark icon */}
      <button className="flex-shrink-0 self-start text-lg text-on-surface-variant/50 transition-colors hover:text-secondary">
        🔖
      </button>
    </div>
  );
}
