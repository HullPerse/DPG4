import { useState } from "react";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { MousePointerClick, Plus, Minus } from "lucide-react";
import { openWindow } from "../../index.utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import { effectInterface } from "@/types/items";
import type { ModalType } from "@/types/effect";
import ItemFramework from "../item.framework";
import { itemsApi } from "@/api/items.api";
import { userApi } from "@/api/user.api";
import { ratIds } from "../item.categories";

export const quizEffects: effectInterface[] = [
  ItemFramework.modal(
    "Астролог",
    () =>
      function (ctx: ModalType) {
        const [input, setInput] = useState<string[]>([]);

        return (
          <main className="flex flex-col gap-2">
            {Array.from({ length: 13 }).map((_, index) => (
              <label key={index} className="flex flex-col gap-1">
                <span className="font-bold">#{index + 1}</span>
                <Input
                  type="text"
                  value={input[index]}
                  onChange={(e) =>
                    setInput((prev) => {
                      const next = [...prev];
                      next[index] = e.target.value;
                      return next;
                    })
                  }
                />
              </label>
            ))}
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!input || input.length < 13) return;
                  const allSigns = [
                    "Овен",
                    "Телец",
                    "Близнецы",
                    "Рак",
                    "Лев",
                    "Дева",
                    "Весы",
                    "Скорпион",
                    "Змееносец",
                    "Стрелец",
                    "Козерог",
                    "Водолей",
                    "Рыбы",
                  ];
                  const zodiac12 = allSigns.filter((s) => s !== "Змееносец");
                  const normalizedInput = input.map((s) => s.trim().toLowerCase());
                  const normalizedAll = allSigns.map((s) => s.toLowerCase());
                  const normalized12 = zodiac12.map((s) => s.toLowerCase());
                  const hasAll12 = normalized12.every((sign) => normalizedInput.includes(sign));
                  if (!hasAll12) {
                    await userApi.scoreUser(String(ctx.user.id), -3);
                    await ctx.consume(
                      `${ctx.user.username} попробовал вспомнить знаки зодиака и провалился`,
                    );
                    ctx.close();
                    return;
                  }
                  let score = 6;
                  const hasOphiuchus = normalizedInput.includes("змееносец");
                  const details = hasOphiuchus ? "все 13 знаков зодиака" : "все 12 знаков зодиака";
                  if (hasOphiuchus) {
                    score += 2;
                    const correctOrder = normalizedInput.every(
                      (sign, i) => sign === normalizedAll[i],
                    );
                    if (correctOrder) {
                      score += 2;
                    }
                  } else {
                    const correctOrder = normalizedInput
                      .slice(0, 12)
                      .every((sign, i) => sign === normalized12[i]);
                    if (correctOrder) {
                      score += 2;
                    }
                  }
                  await userApi.scoreUser(String(ctx.user.id), score);
                  await ctx.consume(
                    `${ctx.user.username} вспомнил ${details} и получил ${score} чубриков`,
                  );
                  ctx.close();
                }}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Крысиная грамота",
    () =>
      function (ctx: ModalType) {
        const [input, setInput] = useState<string[]>([""]);

        return (
          <main className="flex flex-col gap-2">
            <span>Подсказка: крысиных предметов где-то между 0 и {ratIds.size}</span>

            {input.map((val, index) => (
              <label key={index} className="flex flex-col gap-1">
                <span className="font-bold">#{index + 1}</span>
                <div className="flex flex-row gap-2">
                  <Input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      setInput((prev) => {
                        const next = [...prev];
                        next[index] = e.target.value;
                        return next;
                      })
                    }
                  />

                  {index === input.length - 1 ? (
                    <Button
                      size="icon"
                      variant="success"
                      className="h-11 w-11"
                      onClick={() => setInput((prev) => [...prev, ""])}
                      disabled={index !== input.length - 1}
                    >
                      <Plus />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="error"
                      className="h-11 w-11"
                      onClick={() => setInput((prev) => prev.filter((_, i) => i !== index))}
                      disabled={index === input.length - 1}
                    >
                      <Minus />
                    </Button>
                  )}
                </div>
              </label>
            ))}
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!input || input.length < 13) return;

                  const ratSuccess = input.filter((v) => ratIds.has(v)).length ?? 0;

                  await userApi.scoreUser(ctx.user.id, ratSuccess);

                  if (ratSuccess >= 3) {
                    await Promise.all(
                      Array.from({ length: 3 }, () =>
                        itemsApi.addInventory(String(ctx.user.id), "dswpfvayiqxul1b"),
                      ),
                    );
                  }

                  await ctx.consume(
                    `${ctx.user.username} вспомнил ${ratSuccess} крыс и получил ${ratSuccess} чубриков ${ratSuccess >= 3 ? "(+ 3 крысы)" : ""}`,
                  );
                  ctx.close();
                }}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Я не тупой",
    () =>
      function (ctx: ModalType) {
        const [answers, setAnswers] = useState<string | null>(null);

        return (
          <main className="flex flex-col gap-2">
            <Button
              variant="link"
              className="flex flex-row self-start"
              onContextMenu={(e) => {
                e.preventDefault();
                openUrl("https://randstuff.ru/question/");
              }}
              onClick={() => openWindow("Янетупой", "https://randstuff.ru/question/", "Я не тупой")}
            >
              Открыть сайт <MousePointerClick />
            </Button>
            <Input
              autoFocus
              type="text"
              min={0}
              max={10}
              arrows
              placeholder="Введите количество ответов"
              value={answers ?? ""}
              onChange={(e) => setAnswers(e.target.value)}
            />
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  const number = Number(answers);
                  if (isNaN(number)) return;
                  await userApi.scoreUser(String(ctx.user.id), number);
                  await ctx.consume(
                    `${ctx.user.username} очень умный! Он ответил на ${answers ?? 0} вопросов`,
                  );
                  ctx.close();
                }}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),
];


