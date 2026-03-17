import Rating from "@/components/shared/rating.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { type GameReview } from "@/types/games";
import { ChevronDown, ChevronUp } from "lucide-react";
import GameApi from "@/api/games.api";

const gameApi = new GameApi();

export default function GameReview({
  id,
  author,
  review,
  votes,
  image,
}: {
  id: string;
  author: string;
  review: { rating: number; comment: string };
  votes: GameReview["votes"];
  image?: File;
}) {
  const user = useUserStore((state) => state.user);

  return (
    <main className="flex flex-row w-full h-fit border-2 border-highlight-high p-2 rounded gap-4 mb-10">
      <section>
        <div className="relative w-16 h-16 rounded border text-center flex items-center justify-center text-4xl buttonShadow">
          {user?.avatar}
          <span
            className="absolute -bottom-2 -right-2 text-base w-10 h-6 rounded border bg-card text-center items-center justify-center font-bold"
            style={{
              color:
                votes && votes.length > 0
                  ? votes.reduce((acc, vote) => acc + vote.vote, 0) > 0
                    ? "green"
                    : "red"
                  : undefined,
            }}
          >
            {votes && votes.length > 0
              ? votes.reduce((acc, vote) => acc + vote.vote, 0)
              : 0}
          </span>
        </div>
        <div className="flex flex-col w-full items-center justify-center mt-4 gap-1">
          <Button
            variant="success"
            className="w-full border"
            onClick={async () => {
              if (!user) return;
              return await gameApi.voteReview(id, String(user.id), 1);
            }}
            disabled={
              author === user?.id ||
              (votes &&
                votes.some(
                  (vote) => vote.userId === user?.id && vote.vote === 1,
                ))
            }
          >
            <ChevronUp />
          </Button>
          <Button
            variant="error"
            className="w-full border"
            onClick={async () => {
              if (!user) return;
              return await gameApi.voteReview(id, String(user.id), -1);
            }}
            disabled={
              author === user?.id ||
              (votes &&
                votes.some(
                  (vote) => vote.userId === user?.id && vote.vote === -1,
                ))
            }
          >
            <ChevronDown />
          </Button>
        </div>
      </section>
      <section className="relative flex flex-col w-full h-full gap-2">
        <div className="border-b h-14 flex items-center">
          <Rating
            value={review?.rating as 1 | 2 | 3 | 4 | 5}
            readOnly
            className="absolute right-2 top-2"
          />
          <span className="font-bold text-xl">ОТЗЫВ:</span>
        </div>
        <span>{review?.comment}</span>
      </section>
    </main>
  );
}
