import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket, Trophy } from "lucide-react";
import { memo, useState } from "react";
import { WindowLoader } from "@/components/shared/loader.component";
import { getJackpotStatus, playJackpot } from "@/api/jackpot.api";
import { useDevModeStore } from "../hooks/dev.store";

function JackpotTab() {
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();
  const [playCount, setPlayCount] = useState(0);
  const getOverrides = useDevModeStore((s) => s.getOverrides);
  const isJackpotDev = useDevModeStore((s) => s.isActive("jackpot"));

  const { data: status, isLoading } = useQuery({
    queryKey: ["jackpotStatus"],
    queryFn: getJackpotStatus,
    refetchInterval: 10_000,
  });

  const playMutation = useMutation({
    mutationFn: () => playJackpot(getOverrides("jackpot")),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["jackpotStatus"] });
      setPlayCount((c) => c + 1);
      if ("newBalance" in res) {
        useUserStore.setState((s) => {
          const u = s.user;
          if (!u) return {};
          return { user: { ...u, tickets: res.newBalance, gamblingBanned: "banned" in res ? res.banned : u.gamblingBanned } };
        });
      }
    },
  });

  const canPlay =
    (isJackpotDev || (user?.tickets ?? 0) >= 10) &&
    !playMutation.isPending &&
    !user?.gamblingBanned;
  const lastResult = playMutation.data;

  if (isLoading) return <WindowLoader />;

  return (
    <main className="flex flex-col w-full h-full gap-3 p-2 overflow-y-auto">
      <section className="flex flex-col gap-2 w-full border-2 border-highlight-high bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted">
            Текущий джекпот
          </span>
          <span className="flex items-center gap-1 text-2xl font-bold">
            <Ticket className="size-6" />
            {status?.pool ?? 0}
          </span>
        </div>
        {status?.lastWinnerUsername && (
          <div className="flex items-center justify-between text-sm text-muted border-t border-highlight-high pt-2 mt-1">
            <span className="flex items-center gap-1">
              <Trophy className="size-4" />
              Последний победитель
            </span>
            <span className="font-semibold">{status.lastWinnerUsername}</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-1 w-full border-2 border-highlight-high bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted">
            <Ticket className="size-4" />
            Мои тикеты
          </span>
          <span className="text-lg font-bold">{user?.tickets ?? 0}</span>
        </div>
      </section>

      <section className="flex flex-col gap-2 w-full border-2 border-highlight-high bg-background p-3">
        <h3 className="flex items-center gap-2 font-bold text-lg">
          Испытать удачу
        </h3>
        <p className="text-sm text-muted">
          Стоимость попытки:{" "}
          <span className="font-bold text-base">10 тикетов</span>
        </p>
        <p className="text-xs text-muted">Шанс выиграть джекпот: 1 к 1000</p>
        <Button
          variant="success"
          className="h-12 w-full text-lg font-bold mt-2"
          loading={playMutation.isPending}
          disabled={!canPlay}
          onClick={() => playMutation.mutate()}
        >
          {user?.gamblingBanned
            ? "Забанен"
            : !isJackpotDev && (user?.tickets ?? 0) < 10
              ? "Недостаточно тикетов"
              : "Крутить!"}
        </Button>
        {playMutation.isError && (
          <span className="text-sm text-red-400 text-center">
            {(playMutation.error as Error).message}
          </span>
        )}
      </section>

      {lastResult && (
        <section className="flex flex-col gap-2 w-full border-2 border-highlight-high bg-background p-3">
          {lastResult.win ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Trophy className="size-12" />
              <span className="text-2xl font-bold">ДЖЕКПОТ!</span>
              <span className="flex items-center gap-1 text-xl font-bold">
                +<Ticket className="size-5" />
                {lastResult.prize} тикетов
              </span>
              <span className="text-sm text-muted">
                Число: {lastResult.chosen}
              </span>
              {lastResult.banned && (
                <span className="text-sm text-red-400">
                  Выигрыш превысил лимит — доступ к азартным играм ограничен
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-xl font-bold text-muted">Не повезло</span>

              <span className="text-sm text-muted">Попытка {playCount}</span>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default memo(JackpotTab);
