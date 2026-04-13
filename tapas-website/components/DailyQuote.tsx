export default function DailyQuote() {
  return (
    <section className="bg-surface py-space-4xl">
      <div className="mx-auto max-w-content px-[var(--content-padding)]">
        <h2 className="mb-6 font-display text-headline-lg font-semibold text-primary">
          Daily Literary Quote
        </h2>

        <div className="rounded-lg bg-surface-container-high p-8">
          <blockquote className="font-display text-body-lg italic leading-relaxed text-on-surface">
            &ldquo;A reader lives a thousand lives before he dies, said Jojen. The man who
            never reads lives only one.&rdquo;
          </blockquote>
          <p className="mt-4 font-body text-body-sm font-medium text-on-surface-variant">
            — George R.R. Martin
          </p>
        </div>
      </div>
    </section>
  );
}
