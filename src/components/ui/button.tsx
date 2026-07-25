import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-ink text-paper shadow-sm hover:bg-accent-strong hover:shadow-md',
        accent: 'bg-accent text-paper shadow-sm hover:bg-accent-strong hover:shadow-md',
        secondary: 'border border-line-strong bg-paper text-ink hover:border-accent hover:text-accent',
        ghost: 'text-ink-soft hover:text-accent',
      },
      size: {
        default: 'h-10 px-5',
        lg: 'h-12 px-7 text-base',
        sm: 'h-8 px-4 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
