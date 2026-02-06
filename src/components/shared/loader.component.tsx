import { Box } from "lucide-react";

export function BigLoader() {
  return (
    <main className="absolute flex flex-col items-center justify-center h-screen w-screen bg-background text-text font-extrabold">
      <Box className="animate-spin size-28" />
    </main>
  );
}

export function SmallLoader({ size }: { size?: number }) {
  return <Box className={`animate-spin size-${size || 4}`} />;
}
