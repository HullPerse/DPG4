import { cn } from "@/lib/utils";
import {
  getResultColor,
  type GameResultData,
} from "@/lib/gambling/gambling.utils";

interface GameResultProps {
  result: GameResultData | null;
}

export function GameResult({ result }: GameResultProps) {
  if (!result) return null;

  return (
    <span
      className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 text-center text-lg font-bold w-full px-1 py-1 bg-black z-599",
        getResultColor(result),
      )}
    >
      {result.label}
      {result.net > 0 && <span> +{result.net}</span>}
      {result.net < 0 && <span> {result.net}</span>}
    </span>
  );
}
