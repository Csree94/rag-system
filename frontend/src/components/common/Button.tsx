import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-lavender text-white hover:bg-lavender-deep shadow-sm hover:shadow-md disabled:hover:shadow-sm',
  secondary: 'bg-coral text-white hover:bg-coral-deep shadow-sm hover:shadow-md',
  ghost: 'bg-transparent text-ink hover:bg-lavender-soft',
  outline: 'bg-card text-ink border border-line hover:border-lavender/50 hover:bg-lavender-soft/40',
  danger: 'bg-coral-soft text-coral-deep hover:bg-coral hover:text-white border border-coral/25',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 select-none
        disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
