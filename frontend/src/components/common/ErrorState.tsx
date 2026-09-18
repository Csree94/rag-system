import { AlertTriangle, RotateCcw, WifiOff, Lock } from 'lucide-react'
import Button from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  kind?: 'generic' | 'network' | 'auth'
}

const presets = {
  network: { icon: WifiOff, title: 'Connection problem' },
  auth: { icon: Lock, title: 'Please log in' },
  generic: { icon: AlertTriangle, title: 'Something went wrong' },
}

export default function ErrorState({ title, message, onRetry, kind = 'generic' }: ErrorStateProps) {
  const { icon: Icon, title: presetTitle } = presets[kind]
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 anim-fade-up" role="alert">
      <div className="w-14 h-14 rounded-2xl bg-coral-soft flex items-center justify-center text-coral mb-4">
        <Icon size={26} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">{title ?? presetTitle}</h3>
      <p className="text-sm text-muted max-w-sm mb-5">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw size={14} aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}
