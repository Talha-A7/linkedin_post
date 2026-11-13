export function PageLoading() {
  return (
    <>
      <div className="h-[57px] border-b border-border bg-surface" />
      <main className="grid flex-1 place-items-center py-24">
        <span className="size-8 animate-spin rounded-full border-4 border-brand border-r-transparent" aria-label="Loading" />
      </main>
    </>
  );
}
