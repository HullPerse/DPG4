import type { ReactNode } from "react";

interface BalanceDisplayProps {
  balance: number;
  ticketBalance?: number;
  children?: ReactNode;
}

export function BalanceDisplay({
  balance,
  ticketBalance,
  children,
}: BalanceDisplayProps) {
  return (
    <section className="flex flex-col w-full items-stretch gap-1 border-2 border-highlight-high bg-background px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Баланс</span>
        <div className="flex flex-col items-end">
          <span className="text-lg font-bold">{balance} чубриков</span>
          {ticketBalance !== undefined && (
            <span className="text-sm text-muted">{ticketBalance} тикетов</span>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
