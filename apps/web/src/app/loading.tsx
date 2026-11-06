export default function Loading() {
  return (
    <main id="main-content" aria-busy="true" aria-label="Đang tải nội dung" className="adora-container py-24">
      <div className="h-3 w-28 animate-pulse bg-[var(--adora-hairline)]" />
      <div className="mt-8 h-24 max-w-2xl animate-pulse bg-[var(--adora-ivory)]" />
      <div className="mt-10 h-72 animate-pulse bg-[var(--adora-ivory)]" />
      <span className="sr-only" role="status">
        Đang tải nội dung…
      </span>
    </main>
  );
}
