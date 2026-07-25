import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer appearance-none items-center justify-center gap-2 rounded-full border-0 text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-lime text-ink hover:bg-lime-strong hover:shadow-[0_0_24px_rgb(214_242_66/25%)]',
        secondary: 'bg-paper text-ink hover:bg-fg',
        outline: 'border border-line-strong bg-transparent text-fg hover:border-lime hover:text-lime',
        ghost: 'bg-transparent text-fg-soft hover:text-fg',
      },
      size: {
        default: 'h-10 px-5',
        lg: 'h-12 px-7 text-base',
        sm: 'h-9 px-4 text-[13px]',
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
