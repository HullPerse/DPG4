import { Image } from "@/components/shared/image.component";
import { Game, GameStatus } from "@/types/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import GameApi from "@/api/games.api";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  Check,
  Clock,
  ExternalLink,
  NetworkIcon,
  NotebookPen,
  RussianRuble,
  Trash,
  X,
} from "lucide-react";

import { calculateScore, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import SettingsLibrary from "./settings.library";
import { EditReview, ReviewLibrary } from "./review.library";
import { useSubscription } from "@/hooks/subscription.hook";
import { openUrl } from "@tauri-apps/plugin-opener";
import SteamSvg from "@/components/svg/steam.component";
import { gameButtons } from "@/config/library.config";
import UserApi from "@/api/user.api";

const gameApi = new GameApi();
const userApi = new UserApi();

function GameLibrary({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const [content, setContent] = useState<"general" | "review" | "editGame">(
    "general",
  );
  const [loading, setLoading] = useState<
    { button: GameStatus; loading: boolean }[]
  >(gameButtons.map((item) => ({ button: item.value, loading: false })));
  const [time, setTime] = useState<string>("0");
  const [showTimeInput, setShowTimeInput] = useState(false);

  const {
    data: game,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["gameInstance", id],
    queryFn: async (): Promise<Game> => await gameApi.getGameInfo(id),
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["gameInstance", id],
        refetchType: "all",
      });
    });
  }, [queryClient, id]);

  useSubscription("games", "*", invalidateQuery);

  useEffect(() => {
    if (id) {
      setContent("general");
    }
  }, [id]);

  const contentComponent = useMemo(() => {
    if (!id) return null;

    const componentMap = {
      editGame: <SettingsLibrary />,
      review: <EditReview id={id} setContent={setContent} />,
      general: <ReviewLibrary id={id} />,
    };

    return componentMap[content as keyof typeof componentMap];
  }, [content, id]);

  const buttonStyle = (buttonStatus: GameStatus) => {
    if (!buttonStatus) return null;

    const styleMap = {
      PLAYING: "warning",
      COMPLETED: "success",
      DROPPED: "error",
      REROLLED: "info",
    };
    return styleMap[buttonStatus as keyof typeof styleMap];
  };

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке игры")}
        icon={<NetworkIcon />}
      />
    );

  return (
    <main className="flex flex-col w-full h-full">
      {/* GAME */}
      <section className="flex flex-col w-full">
        {/* HEADER */}
        <div></div>
        {/* b */}
        <div></div>
      </section>
      {/* REVIEW */}
      <section></section>
    </main>
    // <main className="flex h-full w-full flex-col">
    //   <section className="flex w-full flex-col">
    //     <div className="relative flex w-full flex-col overflow-hidden object-cover">
    //       <Image
    //         src={game?.data.backgroundImage ?? ""}
    //         alt="game background"
    //         className="h-64 blur-xs brightness-75"
    //       />

    //       <div className="absolute top-2 right-2 flex flex-row gap-1">
    //         {gameButtons.map((item) => (
    //           <div
    //             key={item.value}
    //             className="flex flex-row items-center gap-1"
    //           >
    //             {item.value === "COMPLETED" && showTimeInput && (
    //               <>
    //                 <Button
    //                   size="icon"
    //                   variant="success"
    //                   className="border text-text"
    //                   style={{
    //                     boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
    //                   }}
    //                   onClick={async () => {
    //                     const currentLoadingIndex = loading.findIndex(
    //                       (l) => l.button === item.value,
    //                     );
    //                     if (currentLoadingIndex === -1) return;

    //                     setLoading((prev) => {
    //                       const newLoading = [...prev];
    //                       newLoading[currentLoadingIndex] = {
    //                         ...newLoading[currentLoadingIndex],
    //                         loading: true,
    //                       };
    //                       return newLoading;
    //                     });

    //                     try {
    //                       const newScore =
    //                         item.value === "COMPLETED"
    //                           ? calculateScore(
    //                               Number(time),
    //                               Number(game?.playtime.hltb),
    //                             )
    //                           : game?.score;

    //                       await gameApi.changeStatus(
    //                         id,
    //                         game as Game,
    //                         item.value,
    //                         Number(time),
    //                         Number(newScore),
    //                       );

    //                       if (item.value === "COMPLETED") {
    //                         await userApi.scoreUser(
    //                           String(game?.user.id),

    //                           calculateScore(
    //                             Number(time),
    //                             Number(game?.playtime.hltb),
    //                           ),
    //                         );
    //                       }

    //                       setShowTimeInput(false);
    //                       setTime("0");
    //                       invalidateQuery();
    //                     } catch (error) {
    //                       console.error(error);
    //                     } finally {
    //                       setLoading((prev) => {
    //                         const newLoading = [...prev];
    //                         newLoading[currentLoadingIndex] = {
    //                           ...newLoading[currentLoadingIndex],
    //                           loading: false,
    //                         };
    //                         return newLoading;
    //                       });
    //                     }
    //                   }}
    //                   disabled={
    //                     loading.some((l) => l.loading) || !time || time === "0"
    //                   }
    //                 >
    //                   {loading.find((l) => l.button === item.value)?.loading ? (
    //                     <SmallLoader />
    //                   ) : (
    //                     <Check />
    //                   )}
    //                 </Button>
    //                 <Input
    //                   type="number"
    //                   value={time}
    //                   onChange={(e) => setTime(e.target.value)}
    //                   className="h-9 w-20 text-xs"
    //                   min={0}
    //                   arrows={false}
    //                 />

    //                 <Button
    //                   size="icon"
    //                   variant="error"
    //                   className="border text-text opacity-100"
    //                   style={{
    //                     boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
    //                   }}
    //                   onClick={() => {
    //                     setShowTimeInput(false);
    //                     setTime("0");
    //                   }}
    //                 >
    //                   <X />
    //                 </Button>
    //               </>
    //             ) : (
    //               <Button
    //                 variant={
    //                   buttonStyle(item.value) as
    //                     | "default"
    //                     | "success"
    //                     | "error"
    //                     | "ghost"
    //                     | "link"
    //                     | null
    //                     | undefined
    //                 }
    //                 size="icon"
    //                 title={item.value}
    //                 className="border text-text opacity-100"
    //                 style={{
    //                   boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
    //                 }}
    //                 disabled={
    //                   (game && game.status === item.value) ||
    //                   loading.some((l) => l.loading)
    //                 }
    //                 onClick={async () => {
    //                   if (item.value === "COMPLETED") {
    //                     setShowTimeInput(true);
    //                     return;
    //                   }

    //                   const currentLoadingIndex = loading.findIndex(
    //                     (l) => l.button === item.value,
    //                   );
    //                   if (currentLoadingIndex === -1) return;

    //                   setLoading((prev) => {
    //                     const newLoading = [...prev];
    //                     newLoading[currentLoadingIndex] = {
    //                       ...newLoading[currentLoadingIndex],
    //                       loading: true,
    //                     };
    //                     return newLoading;
    //                   });

    //                   try {
    //                     await gameApi.changeStatus(
    //                       id,
    //                       game as Game,
    //                       item.value,
    //                       0,
    //                     );
    //                     invalidateQuery();
    //                   } catch (error) {
    //                     console.error(error);
    //                   } finally {
    //                     setLoading((prev) => {
    //                       const newLoading = [...prev];
    //                       newLoading[currentLoadingIndex] = {
    //                         ...newLoading[currentLoadingIndex],
    //                         loading: false,
    //                       };
    //                       return newLoading;
    //                     });
    //                   }
    //                 }}
    //               >
    //                 {loading.find((l) => l.button === item.value)?.loading ? (
    //                   <SmallLoader />
    //                 ) : (
    //                   item.icon
    //                 )}
    //               </Button>
    //             )}
    //           </div>
    //         ))}

    //         <Button
    //           variant="link"
    //           size="icon"
    //           title="Отзыв"
    //           className="border text-text opacity-100"
    //           style={{
    //             boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
    //           }}
    //           onClick={() => setContent("review")}
    //           disabled={content === "review"}
    //         >
    //           <NotebookPen />
    //         </Button>
    //         <Button
    //           variant="error"
    //           size="icon"
    //           title="Удалить"
    //           className="border text-text opacity-100"
    //           style={{
    //             boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
    //           }}
    //           onClick={async () => await gameApi.removeGame(id)}
    //         >
    //           <Trash />
    //         </Button>
    //       </div>
    //       <div className="relative flex h-12 w-full flex-row items-center border-y-2 border-highlight-high bg-background">
    //         <div className="flex flex-row gap-4 ml-42 w-full">
    //           <div className="flex flex-row items-center gap-2 min-w-fit max-w-64 line-clamp-1">
    //             <Clock className="w-4 h-4" />
    //             <div className="flex flex-col">
    //               <span className="font-bold text-center">Время:</span>
    //               <span>
    //                 {game?.playtime.user && (
    //                   <span>{game?.playtime.user} ч. / </span>
    //                 )}
    //                 {game?.playtime.hltb} ч.
    //               </span>
    //             </div>
    //           </div>
    //           {game?.score && Number(game.score) > 0 && (
    //             <div className="flex flex-row items-center gap-2 min-w-fit max-w-64 line-clamp-1">
    //               <RussianRuble className="w-4 h-4" />
    //               <div className="flex flex-col">
    //                 <span className="font-bold text-center">Чубрики:</span>
    //                 <span>{game.score}</span>
    //               </div>
    //             </div>
    //           )}

    //           <div className="flex flex-row w-full ml-auto gap-2 items-center justify-end mr-2">
    //             {game?.data.websiteLink && (
    //               <Button
    //                 variant="ghost"
    //                 title="Перейти на сайт"
    //                 className="items-center justify-center w-10 h-10 border rounded self-center"
    //                 onClick={() => openUrl(game?.data.websiteLink)}
    //               >
    //                 <ExternalLink />
    //               </Button>
    //             )}

    //             {game?.data.steamLink && (
    //               <Button
    //                 variant="ghost"
    //                 title="Перейти в Steam"
    //                 className="items-center justify-center w-10 h-10 border rounded self-center"
    //                 onClick={() => openUrl(game?.data.steamLink)}
    //               >
    //                 <SteamSvg className="size-6" />
    //               </Button>
    //             )}
    //           </div>
    //         </div>
    //         <div className="absolute bottom-4.5 left-2 h-52 w-36 overflow-hidden rounded border-2 border-highlight-high bg-background">
    //           <Image
    //             src={game?.data.image ?? ""}
    //             alt="game background"
    //             className="h-full w-full"
    //           />
    //           <div
    //             className="absolute top-8 left-14 h-5 w-full rotate-45 border-2 border-highlight-high"
    //             style={{
    //               backgroundColor: getStatusColor(game?.status ?? "PLAYING"),
    //               boxShadow: "-4px 2px 10px 4px rgba(0, 0, 0, 0.67)",
    //             }}
    //           />
    //         </div>
    //       </div>
    //     </div>
    //   </section>
    //   <section className="relative flex h-full w-full flex-col p-2 overflow-y-auto">
    //     {content !== "general" && (
    //       <Button
    //         variant="ghost"
    //         size="icon"
    //         title="Закрыть"
    //         className="absolute top-1 right-1"
    //         onClick={() => setContent("general")}
    //       >
    //         <X />
    //       </Button>
    //     )}
    //     {contentComponent}
    //   </section>
    // </main>
  );
}

export default memo(GameLibrary);
