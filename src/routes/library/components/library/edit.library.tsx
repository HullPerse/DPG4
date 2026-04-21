import { WindowError } from "@/components/shared/error.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon, Save, StepBack } from "lucide-react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { Button } from "@/components/ui/button.component";
import { memo, startTransition, useCallback, useEffect, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import Rating from "@/components/shared/rating.component";
import { image } from "@/api/client.api";
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
  setContent: (value: "general" | "review") => void;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
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

      const image = imageFile ? imageFile : remove ? null : data.game.image;

      await gameApi.saveReview(
        String(data.game.user.id),
        id,
        review,
        image as File | null,
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
    <main className="flex h-full w-full flex-col gap-4 p-4 overflow-y-auto pb-5">
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
          onRemove={() => {
            setImageFile(null);
            setRemove(true);
          }}
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

      <div className="flex flex-row gap-2 justify-end">
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
      </div>
    </main>
  );
}

export default memo(EditReview);
