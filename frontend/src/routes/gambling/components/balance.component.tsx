import type { ReactNode } from "react";

interface BalanceDisplayProps {
  balance: number;
  children?: ReactNode;
}

export function BalanceDisplay({ balance, children }: BalanceDisplayProps) {
  return (
    <section className="flex flex-col w-xl items-stretch gap-1 border-2 border-highlight-high bg-background px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Баланс</span>
        <span className="text-lg font-bold">{balance} чубриков</span>
      </div>
      {children}
    </section>
  );
}
