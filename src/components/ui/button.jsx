import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"
import { triggerHaptic } from "@/components/utils/haptics"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-indigo-500/20",
        destructive:
          "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 shadow-sm",
        outline:
          "border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white shadow-sm",
        secondary:
          "bg-white/10 text-white hover:bg-white/20 shadow-sm backdrop-blur-sm border border-white/5",
        ghost: "hover:bg-white/5 text-gray-300 hover:text-white",
        link: "text-violet-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  
  const handleClick = (e) => {
    triggerHaptic('light');
    if (onClick) onClick(e);
  };

  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      onClick={handleClick}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }