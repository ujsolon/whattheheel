export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-16 lg:pb-16">
      <p role="status" className="sr-only">
        Loading trends
      </p>
      <div
        data-testid="trend-skeletons"
        aria-hidden="true"
        className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="aspect-[4/5] animate-pulse border-[3px] border-ink bg-[repeating-linear-gradient(135deg,var(--color-surface-muted)_0,var(--color-surface-muted)_12px,var(--color-surface-stripe)_12px,var(--color-surface-stripe)_24px)] shadow-[4px_4px_0_var(--color-ink)] motion-reduce:animate-none"
          />
        ))}
      </div>
    </main>
  );
}
