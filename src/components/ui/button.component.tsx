import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none cursor-pointer opacity-70 hover:opacity-100 text-center font-bold disabled:cursor-not-allowed border-2 hover:shadow-sharp active:translate-y-0.5 active:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-background text-iris border-iris hover:bg-iris/20 hover:text-text active:bg-iris/40 shadow-sharp-sm",
        success:
          "bg-teal/20 text-teal border-teal hover:bg-teal/60 active:bg-teal/50",
        error:
          "bg-love/20 text-love border-love hover:bg-love/60 active:bg-love/50",
        ghost:
          "hover:bg-highlight-medium hover:text-text shadow-none hover:shadow-none active:translate-x-0 active:translate-y-0 border-0",
        link: "text-iris underline-offset-4 hover:underline border-0 shadow-none hover:shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
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
