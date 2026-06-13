import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useUserStore } from "@/store/user.store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Ticket, ShoppingCart, DollarSign, Store } from "lucide-react";
import { memo, useState } from "react";
import { getTicketInfo, buyTickets, sellTicketsDirect, sellTickets } from "@/api/tickets.api";
import { WindowLoader } from "@/components/shared/loader.component";

function CassaTab() {
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const [buyAmount, setBuyAmount] = useState("");
  const [directSellAmount, setDirectSellAmount] = useState("");
  const [marketSellAmount, setMarketSellAmount] = useState("");
  const [marketSellPrice, setMarketSellPrice] = useState("");

  const { data: ticketInfo, isLoading } = useQuery({
    queryKey: ["ticketInfo"],
    queryFn: getTicketInfo,
  });

  const buyMutation = useMutation({
    mutationFn: () => buyTickets(Number(buyAmount)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["ticketInfo"] });
      if (user) {
        useUserStore.setState({
          user: {
            ...user,
            money: user.money - res.cost,
            tickets: res.balance,
          },
        });
      }
      setBuyAmount("");
    },
  });

  const directSellMutation = useMutation({
    mutationFn: () => sellTicketsDirect(Number(directSellAmount)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["ticketInfo"] });
      if (user) {
        useUserStore.setState({
          user: {
            ...user,
            money: user.money + res.payout,
            tickets: res.newBalance,
          },
        });
      }
      setDirectSellAmount("");
    },
  });

  const marketSellMutation = useMutation({
    mutationFn: () => sellTickets(Number(marketSellAmount), Number(marketSellPrice)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketInfo"] });
      if (user) {
        useUserStore.setState({
          user: {
            ...user,
            tickets: (user.tickets ?? 0) - Number(marketSellAmount),
          },
        });
      }
      setMarketSellAmount("");
      setMarketSellPrice("");
    },
  });

  const buyAmountNum = Number(buyAmount);
  const directSellAmountNum = Number(directSellAmount);
  const marketSellAmountNum = Number(marketSellAmount);
  const marketSellPriceNum = Number(marketSellPrice);
  const maxBuy = ticketInfo?.dailyRemaining ?? 0;
  const canBuy =
    buyAmountNum > 0 &&
    buyAmountNum <= maxBuy &&
    buyAmountNum <= (user?.money ?? 0) &&
    !buyMutation.isPending;

  const canDirectSell =
    directSellAmountNum > 0 &&
    directSellAmountNum <= (user?.tickets ?? 0) &&
    !directSellMutation.isPending;

  const canMarketSell =
    marketSellAmountNum >= 5 &&
    marketSellAmountNum <= (user?.tickets ?? 0) &&
    marketSellPriceNum >= 1 &&
    !marketSellMutation.isPending;

  if (isLoading) return <WindowLoader />;

  return (
    <main className="flex flex-col w-full h-full gap-3 p-2 overflow-y-auto">
      <header className="flex items-center gap-2">
        <Ticket className="size-6 text-primary" />
        <h2 className="text-xl font-bold">Касса</h2>
      </header>

      <section className="flex flex-col gap-2 w-full border-2 border-highlight-high bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted">
            <DollarSign className="size-4" />
            Чубриков
          </span>
          <span className="text-lg font-bold">{user?.money ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted">
            <Ticket className="size-4" />
            Тикетов
          </span>
          <span className="text-lg font-bold">{user?.tickets ?? 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Осталось сегодня</span>
          <span>
            {maxBuy} / {ticketInfo?.maxPerDay ?? 100}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-2 w-full border-2 border-highlight-high bg-background p-3">
        <h3 className="flex items-center gap-2 font-bold text-lg">
          <ShoppingCart className="size-5" />
          Купить тикеты
        </h3>
        <p className="text-sm text-muted">
          1 тикет = 1 чубрик. Доступно ещё {maxBuy}
        </p>
        <div className="flex flex-row gap-2 items-center">
          <Input
            type="number"
            min={1}
            max={maxBuy}
            placeholder="Количество"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="flex-1"
          />
          <Button
            className="h-11"
            variant="success"
            loading={buyMutation.isPending}
            disabled={!canBuy}
            onClick={() => buyMutation.mutate()}
          >
            Купить за {buyAmountNum || 0} чубриков
          </Button>
        </div>
        {buyMutation.isError && (
          <span className="text-sm text-red-400">
            {(buyMutation.error as Error).message}
          </span>
        )}
      </section>

      <section className="flex flex-col gap-2 w-full border-2 border-highlight-high bg-background p-3">
        <h3 className="flex items-center gap-2 font-bold text-lg">
          <Coins className="size-5" />
          Продать тикеты (1:1)
        </h3>
        <p className="text-sm text-muted">
          1 тикет = 1 чубрик
        </p>
        <div className="flex flex-row gap-2 items-center">
          <Input
            type="number"
            min={1}
            placeholder="Количество"
            value={directSellAmount}
            onChange={(e) => setDirectSellAmount(e.target.value)}
            className="flex-1"
          />
          <Button
            className="h-11"
            variant="info"
            loading={directSellMutation.isPending}
            disabled={!canDirectSell}
            onClick={() => directSellMutation.mutate()}
          >
            Продать за {directSellAmountNum || 0} чубриков
          </Button>
        </div>
        {directSellMutation.isError && (
          <span className="text-sm text-red-400">
            {(directSellMutation.error as Error).message}
          </span>
        )}
      </section>

      <section className="flex flex-col gap-2 w-full border-2 border-highlight-high bg-background p-3">
        <h3 className="flex items-center gap-2 font-bold text-lg">
          <Store className="size-5" />
          Выставить на АВИТО
        </h3>
        <p className="text-sm text-muted">Минимум 5 тикетов за объявление</p>
        <div className="flex flex-row gap-2 items-center">
          <Input
            type="number"
            min={5}
            placeholder="Количество"
            value={marketSellAmount}
            onChange={(e) => setMarketSellAmount(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            min={1}
            placeholder="Цена за тикет"
            value={marketSellPrice}
            onChange={(e) => setMarketSellPrice(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="info"
            loading={marketSellMutation.isPending}
            className="h-11"
            disabled={!canMarketSell}
            onClick={() => marketSellMutation.mutate()}
          >
            Выставить
          </Button>
        </div>
        {marketSellAmountNum >= 5 && marketSellPriceNum >= 1 && (
          <p className="text-sm text-muted">
            Итого: {marketSellAmountNum} тикетов за {marketSellAmountNum * marketSellPriceNum} чубриков
          </p>
        )}
        {marketSellMutation.isError && (
          <span className="text-sm text-red-400">
            {(marketSellMutation.error as Error).message}
          </span>
        )}
      </section>
    </main>
  );
}

export default memo(CassaTab);
