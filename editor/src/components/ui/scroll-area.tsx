import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function ScrollArea({ className, children, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn('relative overflow-hidden', className)} {...props}><ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit] outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]">{children}</ScrollAreaPrimitive.Viewport><ScrollBar /><ScrollAreaPrimitive.Corner /></ScrollAreaPrimitive.Root>;
}

function ScrollBar({ className, orientation = 'vertical', ...props }: ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return <ScrollAreaPrimitive.Scrollbar data-slot="scroll-area-scrollbar" orientation={orientation} className={cn('flex touch-none p-px transition-colors select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col', className)} {...props}><ScrollAreaPrimitive.Thumb className="bg-border relative flex-1 rounded-full" /></ScrollAreaPrimitive.Scrollbar>;
}
