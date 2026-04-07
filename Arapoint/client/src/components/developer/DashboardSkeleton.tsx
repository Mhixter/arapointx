import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--dev-card)", border: "1px solid var(--dev-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24 bg-gray-700/40" />
        <Skeleton className="h-8 w-8 rounded-lg bg-gray-700/40" />
      </div>
      <Skeleton className="h-7 w-32 bg-gray-700/40" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--dev-card)", border: "1px solid var(--dev-border)" }}>
      <Skeleton className="h-5 w-40 mb-4 bg-gray-700/40" />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 bg-gray-700/40 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--dev-card)", border: "1px solid var(--dev-border)" }}>
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--dev-border)" }}>
        <Skeleton className="h-5 w-36 bg-gray-700/40" />
        <Skeleton className="h-8 w-20 rounded-md bg-gray-700/40" />
      </div>
      <div className="divide-y" style={{ borderColor: "var(--dev-border)" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton className="h-4 w-4 rounded bg-gray-700/40 flex-shrink-0" />
            <Skeleton className="h-4 flex-1 bg-gray-700/40" />
            <Skeleton className="h-4 w-20 bg-gray-700/40" />
            <Skeleton className="h-5 w-16 rounded-full bg-gray-700/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 mb-2 bg-gray-700/40" />
          <Skeleton className="h-4 w-64 bg-gray-700/40" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg bg-gray-700/40" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <TableSkeleton />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Skeleton className="h-7 w-48 mb-2 bg-gray-700/40" />
        <Skeleton className="h-4 w-64 bg-gray-700/40" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
