import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold font-mono tracking-wide",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-[0.78] disabled:saturate-[0.85] disabled:hover:translate-y-0 disabled:hover:brightness-100",
    "active:scale-[0.97] hover:-translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "relative overflow-hidden border border-primary/45 text-primary-foreground",
          "bg-gradient-to-b from-primary via-primary to-primary/78",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-2px_0_rgba(0,0,0,0.18),0_6px_18px_rgba(0,0,0,0.45),0_0_26px_hsla(120,100%,50%,0.28)]",
          "hover:border-primary/65 hover:brightness-105",
          "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-2px_0_rgba(0,0,0,0.22),0_8px_22px_rgba(0,0,0,0.52),0_0_34px_hsla(120,100%,50%,0.38)]",
        ].join(" "),
        blue: [
          "relative overflow-hidden border border-sky-400/50 text-white",
          "bg-gradient-to-b from-sky-400 via-blue-600 to-blue-950",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-2px_0_rgba(0,0,0,0.22),0_6px_18px_rgba(0,0,0,0.45),0_0_28px_rgba(56,189,248,0.35)]",
          "hover:border-sky-300/70 hover:brightness-105",
          "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-2px_0_rgba(0,0,0,0.28),0_8px_22px_rgba(0,0,0,0.55),0_0_38px_rgba(56,189,248,0.45)]",
        ].join(" "),
        destructive: [
          // Brighter red pill (aligned with IntroScreen red tone)
          "relative overflow-hidden border border-[#fecaca] text-white",
          "[text-shadow:0_0_14px_rgba(255,255,255,0.55),0_2px_3px_rgba(0,0,0,0.38)]",
          "bg-[linear-gradient(155deg,#fee2e2_0%,#f87171_22%,#ef4444_52%,#dc2626_82%,#b91c1c_100%)]",
          "shadow-[inset_0_2px_0_rgba(255,255,255,0.48),inset_0_-8px_14px_rgba(90,0,0,0.38),inset_0_-16px_18px_rgba(60,0,0,0.3),0_0_44px_rgba(248,113,113,0.72),0_0_28px_rgba(252,165,165,0.55),0_16px_24px_rgba(0,0,0,0.42),0_5px_11px_rgba(185,28,28,0.65)]",
          "hover:border-white/40 hover:brightness-[1.08]",
          "hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.52),inset_0_-8px_14px_rgba(90,0,0,0.42),inset_0_-16px_18px_rgba(60,0,0,0.34),0_0_52px_rgba(252,165,165,0.78),0_0_36px_rgba(248,113,113,0.65),0_18px_28px_rgba(0,0,0,0.48),0_5px_11px_rgba(185,28,28,0.72)]",
          "focus-visible:ring-[#fca5a5]/80",
        ].join(" "),
        outline: [
          "border-2 border-border/80 bg-card/45 text-foreground backdrop-blur-sm",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_14px_rgba(0,0,0,0.28)]",
          "hover:border-primary/42 hover:bg-primary/10 hover:text-primary",
          "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_18px_rgba(0,0,0,0.34),0_0_22px_hsla(120,100%,50%,0.12)]",
        ].join(" "),
        secondary: [
          "border border-secondary/55 text-secondary-foreground",
          "bg-gradient-to-b from-secondary to-secondary/85",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_14px_rgba(0,0,0,0.38)]",
          "hover:to-secondary/72 hover:border-secondary/80",
        ].join(" "),
        ghost:
          "rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/45 hover:border-border/55 hover:shadow-[0_0_18px_rgba(0,0,0,0.22)]",
        link: "rounded-lg border-0 bg-transparent px-0 text-primary underline-offset-4 shadow-none hover:underline hover:text-primary/85 active:scale-100 hover:translate-y-0",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-10 text-base",
        icon: "h-10 w-10 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
