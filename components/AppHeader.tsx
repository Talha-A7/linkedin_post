import Link from "next/link";

export function AppHeader({ email, signedIn = !!email, guest = false }: { email?: string | null; signedIn?: boolean; guest?: boolean }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={signedIn ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-ink">P</span>
          <span className={signedIn ? "hidden sm:inline" : ""}>Profile Pilot</span>
        </Link>
        {signedIn && (
          <nav className="flex items-center gap-0.5 whitespace-nowrap text-sm sm:gap-3">
            <Link href="/audit/new" className="rounded-full px-2.5 py-1.5 hover:bg-surface-2 sm:px-3">Audit</Link>
            <Link href="/posts/new" className="rounded-full px-2.5 py-1.5 hover:bg-surface-2 sm:px-3" aria-label="Write a post"><span className="sm:hidden">Post</span><span className="hidden sm:inline">Write a post</span></Link>
            <Link href="/dashboard" className="rounded-full px-2.5 py-1.5 hover:bg-surface-2 sm:px-3">History</Link>
            {guest ? (
              <span className="rounded-full bg-surface-2 px-2.5 py-1.5 text-xs text-muted">Guest</span>
            ) : (
              <form action="/auth/signout" method="post">
                <button className="rounded-full px-3 py-1.5 text-muted hover:bg-surface-2" title={email ?? undefined}>Sign out</button>
              </form>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
