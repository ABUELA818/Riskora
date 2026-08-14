export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 4, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-5 py-3.5">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
