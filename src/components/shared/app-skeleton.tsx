import { Skeleton } from '@/components/ui/skeleton';

/**
 * Full-page loading placeholder that mirrors the console layout (sidebar · header ·
 * content). Shown during auth/role resolution and first data load instead of a bare
 * spinner, so the app fades into shape rather than flashing a lonely circle.
 */
export function AppSkeleton() {
  return (
    <div className="flex min-h-svh w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border p-3 md:flex">
        <Skeleton className="mb-6 h-9 w-32 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
        </div>
        <Skeleton className="mt-auto h-12 w-full rounded-lg" />
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
        <div className="flex-1 space-y-5 p-6">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
