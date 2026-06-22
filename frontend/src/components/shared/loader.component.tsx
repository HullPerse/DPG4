import { cn } from "@/lib/index.utils";
import { Spinner } from "@/components/ui/spinner.component";

export function BigLoader() {
  return (
    <main className="absolute flex h-screen w-screen flex-col items-center justify-center bg-background font-extrabold text-text">
      <Spinner className="size-28" size={112} />
    </main>
  );
}

export function WindowLoader({ className }: { className?: string }) {
  return (
    <main
      className={cn(
        "flex h-full w-full flex-col items-center justify-center bg-card font-extrabold text-text",
        className,
      )}
    >
      <Spinner className="size-28" size={112} />
    </main>
  );
}

export function SmallLoader({ size, className }: { size?: number; className?: string }) {
  return <Spinner size={size} className={className} />;
}
