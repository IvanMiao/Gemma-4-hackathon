import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-paper shadow-[0_1px_2px_rgb(14_27_34/4%),0_8px_24px_rgb(14_27_34/5%)] transition-shadow duration-300 hover:shadow-[0_2px_4px_rgb(14_27_34/6%),0_16px_40px_rgb(14_27_34/9%)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 p-6 pb-2', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-base font-semibold text-ink', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-2 text-sm leading-relaxed text-ink-soft', className)} {...props} />
}
