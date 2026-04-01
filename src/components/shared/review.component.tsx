import { GameReview } from "@/types/games";
import { User } from "@/types/user";
import { memo, useCallback } from "react";
import { Button } from "../ui/button.component";
import { ChevronDown, ChevronUp } from "lucide-react";

import Rating from "./rating.component";
import Image from "./image.component";

import GameApi from "@/api/games.api";
import { parseReviewText } from "@/lib/review.utils";

const gameApi = new GameApi();

function Review({
  id,
  title,
  review,
  image,
  user,
}: {
  id: string;
  title: string;
  review: GameReview;
  image: string | null;
  user: User;
}) {
  const handleVote = useCallback(
    async (type: "up" | "down") => {
      if (!review) return;

      await gameApi.voteReview(
        id,
        { id: String(user.id), username: user.username },
        type === "up" ? 1 : -1,
      );
    },
    [review, user, id],
  );

  if (!review)
    return (
      <span className="flex h-full w-full items-center justify-center text-2xl font-bold">
        Тут будет ваш отзыв!
      </span>
    );

  const reviewText = review?.comment;
  const reviewParts = reviewText ? parseReviewText(reviewText) : [];

  return (
    <main className="flex flex-row w-full h-full border-2 border-highlight-high">
      {/* USER */}
      <section className="flex flex-col h-full w-25 min-w-25 items-center border-r-2 border-highlight-high p-1 gap-1">
        <div className="flex size-20 items-center justify-center text-4xl border-2 border-highlight-high">
          {user.avatar}
        </div>
        <Button
          size="icon"
          variant="success"
          className="w-full"
          onClick={() => handleVote("up")}
        >
          <ChevronUp
            className="size-8"
            color={
              review?.votes?.some(
                (item) => item.user === String(user.id) && item.score === 1,
              )
                ? "gold"
                : "white"
            }
          />
        </Button>

        {(() => {
          const totalScore =
            review?.votes?.reduce((a, b) => a + b.score, 0) ?? 0;

          return (
            <span
              className="flex w-full items-center justify-center rounded border border-highlight-high bg-background text-center text-[20px] font-bold"
              style={{
                color:
                  totalScore === 0 ? "white" : totalScore > 0 ? "green" : "red",
              }}
            >
              {totalScore}
            </span>
          );
        })()}

        <Button
          size="icon"
          variant="error"
          className="w-full"
          onClick={() => handleVote("down")}
        >
          <ChevronDown
            className="size-8"
            color={
              review?.votes?.some(
                (item) => item.user === String(user.id) && item.score === -1,
              )
                ? "gold"
                : "white"
            }
          />
        </Button>
      </section>

      {/* REVIEW */}
      <section className="flex flex-col w-full">
        {/* RATING */}
        <div className="flex flex-row w-full h-12 min-h-12 items-center justify-between px-1 border-b-2 border-highlight-high">
          <span className="font-bold text-xl max-w-70 text-center truncate">
            {title}
          </span>
          <Rating value={review.rating as 1 | 2 | 3 | 4 | 5} readOnly />
        </div>
        {/* REVIEW TEXT */}
        <div className="flex flex-col font-bold gap-2 h-full w-full overflow-y-auto p-1 pb-10">
          {reviewParts.map((part, index) => {
            if (part.type === "text")
              return (
                <div
                  key={index.toString() + part.content}
                  className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: part.content }}
                />
              );

            return (
              <div key={index.toString()}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${part.videoId}?modestbranding=1&rel=0`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            );
          })}

          {image && (
            <div className="relative w-full flex h-full min-h-64 border border-highlight-high bg-background">
              <Image src={image} alt={title} loading="lazy" type="contain" />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default memo(Review);
