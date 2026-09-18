interface LoadingProps {
  label?: string
  className?: string
}

export default function Loading({ label = 'Loading…', className = '' }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center gap-3 py-12 ${className}`} role="status" aria-live="polite">
      <span className="h-5 w-5 rounded-full border-2 border-lavender border-t-transparent animate-spin" aria-hidden="true" />
      <span className="text-sm text-muted">{label}</span>
    </div>
  )
}

export function SkeletonCard({ className = 'h-28' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}
