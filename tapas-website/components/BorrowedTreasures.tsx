import BookCard from "./BookCard";
import EventsPanel from "./EventsPanel";

export default function BorrowedTreasures() {
  return (
    <section className="bg-surface-container-low py-space-4xl">
      <div className="mx-auto max-w-content px-[var(--content-padding)]">
        {/* Header */}
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="font-display text-headline-lg font-semibold italic text-primary">
            Borrowed Treasures
          </h2>
          <a
            href="#"
            className="font-body text-label-lg font-semibold text-secondary transition-colors hover:text-secondary-container"
          >
            View Library History
          </a>
        </div>

        {/* Content grid */}
        <div className="flex gap-8">
          {/* Left — Book cards (extra left padding for overlapping covers) */}
          <div className="flex flex-1 flex-col gap-5 pl-8">
            <BookCard
              title="The Shadow of the Wind"
              author="Carlos Ruiz Zafón"
              dueText="Due in 4 days · 75% completed"
              progressPercent={75}
              coverEmoji="📖"
            />
            <BookCard
              title="Meditations"
              author="Marcus Aurelius"
              dueText="Due in 12 days · 32% completed"
              progressPercent={32}
              coverEmoji="📕"
            />
          </div>

          {/* Right — Events */}
          <div className="w-[340px] flex-shrink-0">
            <EventsPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
