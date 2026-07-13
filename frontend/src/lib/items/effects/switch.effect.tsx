import { useState } from "react";
import { Button } from "@/components/ui/button.component";
import { Switch } from "@/components/ui/switch.component";
import { effectInterface } from "@/types/items";
import type { ModalType } from "@/types/effect";
import ItemFramework from "../item.framework";
import { userApi } from "@/api/user.api";

export const switchEffects: effectInterface[] = [
  ItemFramework.modal(
    "Свин или не свин?",
    () =>
      function (ctx: ModalType) {
        const [ate, setAte] = useState<boolean>(false);
        const [food, setFood] = useState<boolean>(false);

        return (
          <main className="flex flex-col gap-2">
            <label className="flex flex-row gap-1">
              <span className="font-bold">Кушал?</span>
              <Switch checked={ate} onCheckedChange={setAte} />
            </label>
            <label className="flex flex-row gap-1">
              <span className="font-bold">Пирожок или огуречич?</span>
              <Switch checked={food} onCheckedChange={setFood} />
            </label>

            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!ate) return;

                  if (ate) await userApi.scoreUser(String(ctx.user.id), -5);
                  else await userApi.scoreUser(String(ctx.user.id), 5);

                  if (food) await userApi.scoreUser(String(ctx.user.id), 1);

                  const text = ate
                    ? "покушал и потерял 5 чубриков"
                    : "не поел, но зато получил 5 чубриков";
                  const textAdd = food ? "ОН ПОЕЛ ОЧЕНЬ КРУТУЮ ЕДУ и получил чубрик" : "";

                  await ctx.consume(`${ctx.user.username} ${text}. ${textAdd}`);

                  ctx.close();
                }}
                disabled={!ate}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Страшная свиная история",
    () =>
      function (ctx: ModalType) {
        const [read, setRead] = useState<boolean>(false);
        const [music, setMusic] = useState<boolean>(false);
        const [pig, setPig] = useState<boolean>(false);

        const [error, setError] = useState<boolean>(false);

        return (
          <main className="flex flex-col gap-2">
            <section className=" overflow-y-auto h-70 min-h-70 max-h-70 border-2 border-iris p-1 text-xl leading-tight tracking-wide font-serif font-semilight">
              В далёкой деревне, затерянной среди лесов, жила старая свинья по кличке Мэгги. Её
              держал в загоне местный фермер, но никто из деревни не подходил близко к её хлеву.
              Говорили, что Мэгги была не совсем обычной свиньёй. Её глаза, тёмные и блестящие,
              словно угольки, казалось, следили за каждым, кто проходил мимо. А по ночам из хлева
              доносились странные звуки - не хрюканье, а что-то похожее на шёпот. Однажды мальчик из
              деревни, любопытный и глупый, решил подойти к хлеву. Он хотел посмотреть, что же там
              происходит. Когда он заглянул внутрь, Мэгги стояла в углу, неподвижно, уставившись на
              него. Её глаза светились в темноте, а изо рта капала густая чёрная жидкость. Мальчик
              хотел убежать, но ноги словно приросли к земле. Тогда Мэгги медленно подошла к нему, и
              её шёпот стал громче: "Ты тоже станешь частью стада..."На следующее утро мальчика
              нашли в хлеву. Он сидел в углу, неподвижно, уставившись в пустоту. Его глаза были
              тёмными и блестящими, словно угольки. А изо рта капала густая чёрная жидкость. С тех
              пор в деревне больше никто не подходил к хлеву. Но по ночам из него до сих пор
              доносится шёпот. И если вы окажетесь там, не смотрите в глаза свинье. Иначе вы станете
              частью стада. → 5 чубриков, если прочитал вслух от начала и до конца. +2 чубрика, если
              при этом была атмосферная музыка. +2 чубрика, если во время чтения пункта кто-нибудь в
              Дискорде жестко хрюкнул. -5 чубриков, если промотал сразу в конец пункта, все испортил
              бля!
            </section>

            <label className="flex flex-row gap-1">
              <span className="font-bold">Прочитал</span>
              <Switch
                checked={read}
                onCheckedChange={() => {
                  setError(false);

                  if (read) setRead(false);
                  else setRead(true);
                }}
              />
            </label>
            <label className="flex flex-row gap-1">
              <span className="font-bold">Атмосферная музыка</span>
              <Switch
                checked={music}
                onCheckedChange={() => {
                  setError(false);

                  if (music) setMusic(false);
                  else setMusic(true);
                }}
              />
            </label>
            <label className="flex flex-row gap-1">
              <span className="font-bold">Хрюкнул</span>
              <Switch
                checked={pig}
                onCheckedChange={() => {
                  setError(false);

                  if (pig) setPig(false);
                  else setPig(true);
                }}
              />
            </label>

            <label className="flex flex-row gap-1 mt-2">
              <span className="font-bold">Скипнул весь текст</span>
              <Switch
                checked={error}
                onCheckedChange={() => {
                  setRead(false);
                  setMusic(false);
                  setPig(false);

                  if (error) setError(false);
                  else setError(true);
                }}
              />
            </label>

            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (read ? !read : !error) return;
                  let finalScore: number = 0;

                  if (error) finalScore = -5;
                  else {
                    if (read) finalScore += 5;
                    if (music) finalScore += 2;
                    if (pig) finalScore += 2;
                  }

                  await userApi.scoreUser(String(ctx.user.id), finalScore);

                  await ctx.consume(
                    `${ctx.user.username} прочитал страшную свиную историю и изменил свои чубрики на ${finalScore}`,
                  );

                  ctx.close();
                }}
                disabled={read ? !read : !error}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),
];


