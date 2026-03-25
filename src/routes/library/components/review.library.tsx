import { WindowError } from "@/components/shared/error.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, NetworkIcon, Save } from "lucide-react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { Button } from "@/components/ui/button.component";
import { startTransition, useCallback, useEffect, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import Rating from "@/components/shared/rating.component";
import { Image } from "@/components/shared/image.component";
import { image } from "@/api/client.api";
import { parseReviewText } from "@/lib/utils";
import { RichTextEditor } from "@/components/shared/editor.component";
import { ImageUploader } from "@/components/shared/uploader.component";
import { useUserStore } from "@/store/user.store";
import { GameReview } from "@/types/games";

const gameApi = new GameApi();
const userApi = new UserApi();

function EditReview({
  id,
  setContent,
}: {
  id: string;
  setContent: (value: "general" | "review" | "editGame") => void;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showExistingImage, setShowExistingImage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["libraryReview", id],
    queryFn: async () => {
      const game = await gameApi.getReview(String(id));
      const userData = await userApi.getUserById(String(game.user.id));

      return { game, user: userData };
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

      let imageToSave: File | null | undefined = imageFile;
      if (!imageFile && !showExistingImage && data?.game.image) {
        imageToSave = null;
      }

      await gameApi.saveReview(
        { id: user.id!, username: user.username },
        id,
        review,
        imageToSave,
      );

      invalidateQuery();
    } catch (error) {
      console.error("Failed to save review:", error);
    } finally {
      setIsSaving(false);
      setContent("general");
    }
  };

  return (
    <main className="flex h-full w-full flex-col gap-4 p-4 overflow-y-auto pb-10">
      <div className="flex flex-col gap-2">
        <span className="text-lg font-bold text-text">Оценка</span>
        <Rating
          value={rating}
          onChange={setRating}
          className="[&>div]:cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-lg font-bold text-text">Изображение</span>
        <ImageUploader
          value={imageFile}
          onChange={setImageFile}
          existingImageUrl={
            data?.game.image
              ? `${image.game}${data.game.id}/${data.game.image}`
              : ""
          }
          showExisting={showExistingImage}
          onRemoveExisting={() => setShowExistingImage(false)}
          className="w-full max-w-md"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-lg font-bold text-text">Отзыв</span>
        <RichTextEditor
          value={reviewText}
          onChange={setReviewText}
          className="flex-1"
          placeholder="Напишите ваш отзыв об игре..."
        />
      </div>

      <div className="flex justify-end">
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
      </div>
    </main>
  );
}

function ReviewLibrary({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["libraryReview", id],
    queryFn: async () => {
      const game = await gameApi.getReview(String(id));
      const user = await userApi.getUserById(String(game.user.id));

      return { game, user };
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

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке отзыва")}
        icon={<NetworkIcon />}
      />
    );

  if (!data?.game.review)
    return (
      <span className="flex h-full w-full items-center justify-center text-2xl font-bold">
        Тут будет ваш отзыв!
      </span>
    );

  const totalScore =
    data?.game.review?.votes?.reduce((a, b) => a + b.score, 0) ?? 0;

  const reviewText = data.game.review?.comment;
  const reviewParts = reviewText ? parseReviewText(reviewText) : [];

  return (
    <main className="flex h-fit w-full flex-row rounded border-2 border-highlight-high">
      <section className="flex h-full w-25 flex-col items-center border-r-2 border-highlight-high p-1">
        <div className="flex size-20 items-center justify-center rounded border-2 border-highlight-high">
          <div className=" flex h-full w-full items-center justify-center pb-2 text-4xl">
            {data?.user.avatar}
          </div>
        </div>
        <div className="flex w-full flex-col gap-1 p-2">
          <Button
            variant="success"
            size="icon"
            className="w-full"
            onClick={async () => {
              if (!data) return;

              await gameApi.voteReview(
                data.game.id,
                {
                  id: String(data.user.id),
                  username: data.user.username,
                },
                1,
              );
            }}
          >
            <ChevronUp
              color={
                data?.game.review?.votes?.some(
                  (item) =>
                    item.user === String(data.user.id) && item.score === 1,
                )
                  ? "gold"
                  : "white"
              }
              className="size-6"
            />
          </Button>
          {
            <span
              className="flex w-full min-w-6 items-center justify-center rounded border border-highlight-high bg-background text-center text-[20px] font-bold"
              style={{
                color:
                  totalScore === 0 ? "white" : totalScore > 0 ? "green" : "red",
              }}
            >
              {totalScore}
            </span>
          }
          <Button
            variant="error"
            size="icon"
            className="w-full"
            onClick={async () => {
              if (!data) return;

              await gameApi.voteReview(
                data.game.id,
                {
                  id: String(data.user.id),
                  username: data.user.username,
                },
                -1,
              );
            }}
          >
            <ChevronDown
              color={
                data?.game.review?.votes?.some(
                  (item) =>
                    item.user === String(data.user.id) && item.score === -1,
                )
                  ? "gold"
                  : "white"
              }
              className="size-6"
            />
          </Button>
        </div>
      </section>
      <section className="flex flex-col w-full h-full pb-10">
        <div className="flex flex-row items-center justify-between w-full p-2 min-h-10 h-10 border-b-2 border-highlight-high">
          <span className="font-bold text-xl max-w-70 text-center truncate">
            {data.game.data.name}
          </span>
          <Rating
            value={data?.game.review?.rating as number as 1 | 2 | 3 | 4 | 5}
            readOnly
          />
        </div>
        <div className="flex flex-col w-full h-full p-1 font-bold gap-2 overflow-y-auto">
          {(() => {
            const isHTML = /<[a-z][\s\S]*>/i.test(reviewText);

            if (isHTML) {
              const youtubeLinks = reviewParts.filter(
                (p) => p.type === "youtube" && p.videoId,
              );

              if (youtubeLinks.length > 0) {
                let processedHTML = reviewText;
                const placeholders: Array<{
                  placeholder: string;
                  videoId: string;
                }> = [];

                for (const [idx, link] of youtubeLinks.entries()) {
                  const placeholder = `__YOUTUBE_PLACEHOLDER_${idx}__`;
                  placeholders.push({
                    placeholder,
                    videoId: link.videoId || "",
                  });
                  const escapedUrl = link.content.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    String.raw`\$&`,
                  );
                  processedHTML = processedHTML.replace(
                    new RegExp(escapedUrl, "g"),
                    placeholder,
                  );
                }

                const parts = processedHTML.split(
                  /(__YOUTUBE_PLACEHOLDER_\d+__)/,
                );

                return (
                  <>
                    {parts.map((part: string, index: number) => {
                      const placeholderMatch =
                        /^__YOUTUBE_PLACEHOLDER_(\d+)__$/.exec(part);
                      if (placeholderMatch) {
                        const placeholderIdx = Number.parseInt(
                          placeholderMatch[1],
                          10,
                        );
                        const { videoId } = placeholders[placeholderIdx];
                        return (
                          <div key={`youtube-${videoId}-${index.toString()}`}>
                            <div
                              className="relative aspect-video rounded border border-highlight-high overflow-hidden"
                              style={{ minWidth: "260px" }}
                            >
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0`}
                                title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                loading="lazy"
                                className="absolute inset-0 w-full h-full"
                              />
                            </div>
                          </div>
                        );
                      }
                      if (part.trim()) {
                        return (
                          <div
                            key={`html-${part.slice(0, 20)}-${index}`}
                            className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: part }}
                          />
                        );
                      }
                      return null;
                    })}
                  </>
                );
              }

              return (
                <div
                  className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: reviewText }}
                />
              );
            }

            return reviewParts.map((part, index) => {
              if (part.type === "youtube" && part.videoId) {
                return (
                  <div key={index.toString()}>
                    <div
                      className="relative w-fit aspect-video rounded border border-highlight-high"
                      style={{ minWidth: "260px" }}
                    >
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${part.videoId}?modestbranding=1&rel=0`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        className="absolute inset-0 h-full w-full"
                      />
                    </div>
                  </div>
                );
              }
              return (
                <span key={index.toString()} className="whitespace-pre-wrap">
                  {part.content}
                </span>
              );
            });
          })()}

          {data.game.image && (
            <div className="relative w-full flex h-full min-h-32 rounded border border-highlight-high bg-background">
              <Image
                src={`${image.game}${data.game.id}/${data.game.image}`}
                alt={data.game.data.name}
                loading="lazy"
                type="contain"
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export { EditReview, ReviewLibrary };
