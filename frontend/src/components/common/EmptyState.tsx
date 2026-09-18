import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 anim-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-lavender-soft flex items-center justify-center text-lavender mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm mb-5">{description}</p>
      {action}
    </div>
  )
}
