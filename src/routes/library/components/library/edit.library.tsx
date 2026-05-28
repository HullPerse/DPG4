import { WindowError } from "@/components/shared/error.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon, Save, StepBack, X } from "lucide-react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { Button } from "@/components/ui/button.component";
import { memo, startTransition, useCallback, useEffect, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import Rating from "@/components/shared/rating.component";
import { getFileUrl } from "@/api/client.api";
import { RichTextEditor } from "@/components/shared/editor.component";
import { ImageUploader } from "@/components/shared/uploader.component";
import { useUserStore } from "@/store/user.store";
import { GameReview } from "@/types/games";
import PaintApi from "@/api/paint.api";
import ImageComponent from "@/components/shared/image.component";
import ImageViewer from "@/components/shared/viewer.component";
import { fileFromUrl } from "@/lib/utils";

const gameApi = new GameApi();
const userApi = new UserApi();
const paintApi = new PaintApi();

function EditReview({
  id,
  setContent,
}: {
  id: string;
  setContent: (value: "general" | "review") => void;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const [selectedDrawingUrl, setSelectedDrawingUrl] = useState<string | null>(
    null,
  );
  const [selectedDrawingFile, setSelectedDrawingFile] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const [tab, setTab] = useState<"custom" | "paint">("custom");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["libraryReview", id],
    queryFn: async () => {
      const game = await gameApi.getReview(String(id));
      const userData = await userApi.getUserById(String(game.user.id));
      const drawings = await paintApi.getDrawinsByAuthor(String(game.user.id));

      return { game, user: userData, drawings };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["libraryReview", id],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("games", "*", invalidateQuery);

  useEffect(() => {
    const existingReview = data?.game.review;

    if (reviewText === "" && existingReview?.comment) {
      setReviewText(existingReview.comment);
    }

    const existingRating = existingReview?.rating;
    if (existingRating) {
      setRating(existingRating as 1 | 2 | 3 | 4 | 5);
    }
  }, [data, reviewText, setReviewText, setRating]);

  if (isLoading || !data) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке отзыва")}
        icon={<NetworkIcon />}
        className="relative"
      />
    );

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const review: GameReview = {
        rating,
        comment: reviewText,
        votes: data?.game.review?.votes || [],
      };

      let image: File | null | undefined;

      if (selectedDrawingFile && selectedDrawingUrl) {
        image = await fileFromUrl(selectedDrawingUrl);
      } else if (imageFile) {
        image = imageFile;
      } else if (remove) {
        image = null;
      }

      await gameApi.saveReview(String(data.game.user.id), id, review, image);

      invalidateQuery();
    } catch (error) {
      console.error("Failed to save review:", error);
    } finally {
      setIsSaving(false);
      setContent("general");
    }
  };

  return (
    <main className="flex h-full w-full flex-col gap-4 p-4 overflow-y-auto pb-5">
      <section className="flex flex-col gap-2">
        <span className="text-lg font-bold text-text">Оценка</span>
        <Rating
          value={rating}
          onChange={setRating}
          className="[&>div]:cursor-pointer"
        />
      </section>

      <section className="flex flex-col gap-1">
        {/*TABS*/}
        <div className="flex flex-row gap-1">
          <Button
            variant="link"
            className="border-iris disabled:border-iris/20 text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 border w-24"
            onClick={() => setTab("custom")}
            disabled={tab === "custom"}
          >
            Загрузить
          </Button>
          <Button
            variant="link"
            className="border-iris disabled:border-iris/20 text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85  border w-24"
            onClick={() => setTab("paint")}
            disabled={tab === "paint"}
          >
            Архив
          </Button>
        </div>

        <div className="flex flex-col border-2 border-iris w-xl gap-2 aspect-video">
          {tab === "custom" ? (
            <>
              <ImageUploader
                value={imageFile}
                existingImageUrl={
                  data?.game.image
                    ? `${getFileUrl(data.game)}`
                    : ""
                }
                onChange={(file) => {
                  setImageFile(file);
                  setSelectedDrawingUrl(null);
                  setSelectedDrawingFile(null);
                }}
                onRemove={() => {
                  setImageFile(null);
                  setRemove(true);
                }}
              />
            </>
          ) : selectedDrawingUrl ? (
            <div className="group relative aspect-video w-full overflow-hidden rounded">
              <ImageComponent
                src={selectedDrawingUrl}
                alt="Preview"
                className="h-full w-full object-contain"
                type="contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="error"
                  size="icon"
                  className="size-10"
                  onClick={() => {
                    setSelectedDrawingUrl(null);
                    setSelectedDrawingFile(null);
                    setImageFile(null);
                    setRemove(true);
                  }}
                  type="button"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col p-1 overflow-y-scroll h-full">
              {data.drawings.map((item, index) => (
                <section
                  key={item.id}
                  className="flex flex-row h-22 min-h-22 border-highlight-high border-2 shadow-sharp-sm p-1 items-center gap-2"
                >
                  <ImageViewer
                    src={[`${getFileUrl(item)}`]}
                    zoomable
                    draggable
                    triggerClassName="w-fit h-fit"
                    trigger={
                      <ImageComponent
                        src={`${getFileUrl(item)}`}
                        alt="Картинка"
                        className="flex h-18 w-28 bg-background border-2 border-iris"
                      />
                    }
                  />

                  <span className="flex w-full">
                    {index + 1}. {item.author.username}
                  </span>

                  <div className="ml-auto flex flex-row gap-1">
                    <Button
                      variant="success"
                      title="Добавить предмет в инвентарь"
                      className="w-28"
                      onClick={() => {
                        setSelectedDrawingUrl(
                          `${getFileUrl(item)}`,
                        );
                        setSelectedDrawingFile(
                          `${getFileUrl(item)}`,
                        );
                        setImageFile(null);
                      }}
                    >
                      Использовать
                    </Button>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
        {/*TAB BODY*/}
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-lg font-bold text-text">Отзыв</span>
        <RichTextEditor
          value={reviewText}
          onChange={setReviewText}
          className="flex-1"
          placeholder="Напишите ваш отзыв об игре..."
        />
      </section>

      <section className="flex flex-row gap-2 justify-end">
        <Button
          variant="error"
          size="lg"
          onClick={() => setContent("general")}
          disabled={isSaving}
          className="min-w-32"
        >
          {isSaving ? (
            <SmallLoader className="size-5 animate-spin" />
          ) : (
            <>
              <StepBack className="size-5" />
              Отменить
            </>
          )}
        </Button>
        <Button
          variant="success"
          size="lg"
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-32"
        >
          {isSaving ? (
            <SmallLoader className="size-5 animate-spin" />
          ) : (
            <>
              <Save className="size-5" />
              Сохранить
            </>
          )}
        </Button>
      </section>
    </main>
  );
}

export default memo(EditReview);
