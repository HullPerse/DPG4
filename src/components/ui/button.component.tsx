import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none rounded cursor-pointer opacity-70 hover:opacity-100 text-center text-text font-bold disabled:cursor-not-allowed border-2",
  {
    variants: {
      variant: {
        default:
          "bg-background text-primary hover:bg-primary/20 border border-primary active:bg-primary/50",
        success:
          "bg-green-500/20 border-green-500 hover:bg-green-500/60 active:bg-green-500/50",
        error:
          "bg-red-500/20 border-red-500 hover:bg-red-500/60 active:bg-red-500/50",
        ghost: "hover:bg-accent hover:text-text border-0",
        link: "text-primary underline-offset-4 hover:underline border-0",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
