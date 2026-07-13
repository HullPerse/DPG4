import { useState } from "react";
import { Button } from "@/components/ui/button.component";
import { effectInterface } from "@/types/items";
import type { ModalType } from "@/types/effect";
import ItemFramework from "../item.framework";
import { itemsApi } from "@/api/items.api";
import { userApi } from "@/api/user.api";

export const randomEffects: effectInterface[] = [
  ItemFramework.modal(
    "Яйцо",
    () =>
      function (ctx: ModalType) {
        const [value, setValue] = useState<number | null>(null);
        const [isRolling, setIsRolling] = useState<boolean>(false);

        const handleRoll = () => {
          if (isRolling) return;

          setIsRolling(true);

          setTimeout(() => {
            const result = Math.floor(Math.floor(Math.random() * 6) + 1);
            setValue(result);
            setIsRolling(false);
          }, 800);
        };

        const getDiceDisplay = () => {
          if (isRolling) {
            return (
              <div className="flex h-22 w-22 transform animate-spin items-center justify-center border border-primary bg-background font-bold rounded text-text shadow-sharp-sm transition-transform hover:scale-105">
                ?
              </div>
            );
          }

          return (
            <div className="flex h-22 w-22 transform items-center justify-center rounded border border-primary bg-background font-bold text-primary shadow-sharp-sm transition-transform hover:scale-105">
              {value}
            </div>
          );
        };

        const possibles = [
          "Ромашка",
          "5 чубриков",
          "Ведро",
          "Арбуз",
          "Легендарный Кал",
          "Доп. кубик на передвижение",
        ];

        return (
          <main className="flex flex-col gap-2">
            <section className="flex flex-col gap-1">
              {possibles.map((item, index) => (
                <span
                  key={item}
                  className="font-bold"
                  style={{ color: index + 1 === value ? "gold" : "white" }}
                >
                  {`${index + 1}: `} {item}
                </span>
              ))}
            </section>
            <button
              role="button"
              type="button"
              className="flex flex-col items-center space-y-1 cursor-pointer group"
              onClick={() => handleRoll()}
              disabled={isRolling}
            >
              {getDiceDisplay()}
            </button>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!value) return;

                  if (value === 1) {
                    const id = "az6vdp4mdxvquwr";

                    await itemsApi.addInventory(ctx.user.id, id);
                  } else if (value === 2) {
                    await userApi.scoreUser(ctx.user.id, 5);
                  } else if (value === 3) {
                    const id = "hytio29eocftliq";

                    await itemsApi.addInventory(ctx.user.id, id);
                  } else if (value === 4) {
                    const id = "rhqziscmz0pumwy";

                    await itemsApi.addInventory(ctx.user.id, id);
                  } else if (value === 5) {
                    const id = "szbxjr8hsdyfowg";

                    await itemsApi.addInventory(ctx.user.id, id);
                  }

                  await ctx.consume(`${ctx.user.username} выбил ${possibles[value - 1]} из яйца`);

                  ctx.close();
                }}
                disabled={!value}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Колесная Фея",
    () =>
      function (ctx: ModalType) {
        const [value, setValue] = useState<number | null>(null);
        const [isRolling, setIsRolling] = useState<boolean>(false);

        const handleRoll = () => {
          if (isRolling) return;

          setIsRolling(true);

          setTimeout(() => {
            const result = Math.floor(Math.floor(Math.random() * 4) + 1);
            setValue(result);
            setIsRolling(false);
          }, 800);
        };

        const getDiceDisplay = () => {
          if (isRolling) {
            return (
              <div className="flex h-22 w-22 transform animate-spin items-center justify-center border border-primary bg-background font-bold rounded text-text shadow-sharp-sm transition-transform hover:scale-105">
                ?
              </div>
            );
          }

          return (
            <div className="flex h-22 w-22 transform items-center justify-center rounded border border-primary bg-background font-bold text-primary shadow-sharp-sm transition-transform hover:scale-105">
              {value}
            </div>
          );
        };

        return (
          <main className="flex flex-col gap-2">
            <button
              role="button"
              type="button"
              className="flex flex-col items-center space-y-1 cursor-pointer group"
              onClick={() => handleRoll()}
              disabled={isRolling}
            >
              {getDiceDisplay()}
            </button>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!value) return;

                  await ctx.consume(
                    `${ctx.user.username} выбил ${value} бесплатных Колес Приколов для ВСЕХ УЧАСТНИКОВ!!!!!!`,
                  );

                  ctx.close();
                }}
                disabled={!value}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Лещ",
    () =>
      function (ctx: ModalType) {
        const [value, setValue] = useState<number | null>(null);
        const [isRolling, setIsRolling] = useState<boolean>(false);

        const handleRoll = () => {
          if (isRolling) return;

          setIsRolling(true);

          setTimeout(() => {
            const result = Math.floor(Math.floor(Math.random() * 4) + 1);
            setValue(result);
            setIsRolling(false);
          }, 800);
        };

        const getDiceDisplay = () => {
          if (isRolling) {
            return (
              <div className="flex h-22 w-22 transform animate-spin items-center justify-center border border-primary bg-background font-bold rounded text-text shadow-sharp-sm transition-transform hover:scale-105">
                ?
              </div>
            );
          }

          return (
            <div className="flex h-22 w-22 transform items-center justify-center rounded border border-primary bg-background font-bold text-primary shadow-sharp-sm transition-transform hover:scale-105">
              {value}
            </div>
          );
        };

        const possibles = [
          "Колесо Приколов",
          "3 чубрика",
          "Шаг вперед по карте",
          "2 шага назад по карте",
        ];

        return (
          <main className="flex flex-col gap-2">
            <section className="flex flex-col gap-1">
              {possibles.map((item, index) => (
                <span
                  key={item}
                  className="font-bold"
                  style={{ color: index + 1 === value ? "gold" : "white" }}
                >
                  {`${index + 1}: `} {item}
                </span>
              ))}
            </section>
            <button
              role="button"
              type="button"
              className="flex flex-col items-center space-y-1 cursor-pointer group"
              onClick={() => handleRoll()}
              disabled={isRolling}
            >
              {getDiceDisplay()}
            </button>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!value) return;

                  if (value === 2) {
                    await userApi.scoreUser(String(ctx.user.id), 3);
                  } else if (value === 3) {
                    await userApi.moveUser(String(ctx.user.id), ctx.user.position + 1);
                  } else if (value === 4) {
                    await userApi.moveUser(String(ctx.user.id), ctx.user.position - 2);
                  }

                  await ctx.consume(`${ctx.user.username} выбил ${possibles[value - 1]} из леща`);

                  ctx.close();
                }}
                disabled={!value}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),
];


