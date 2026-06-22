import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 shrink-0 outline-none cursor-pointer font-bold border-2 hover:shadow-sharp-sm active:translate-y-0.5 active:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-background text-text border-iris hover:bg-iris/20 shadow-sharp-sm",
        primary:
          "bg-primary/20 text-text border-primary hover:bg-primary/40",
        outline:
          "bg-card text-text border-highlight-high hover:border-iris",
        ghost: "border-0 shadow-none hover:bg-highlight-medium",
        danger:
          "bg-love/10 text-love border-love hover:bg-love/25",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
