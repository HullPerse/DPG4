import ImageComponent from "@/components/shared/image.component";
import { getStatusColor } from "@/lib/utils";
import { Game } from "@/types/games";
import { ProfileTab } from "@/types/profile";
import { User } from "@/types/user";

export default function Profile({
  user,
  games,
  setProfileTab,
}: {
  user: User;
  games: Game[];
  setProfileTab: (tab: ProfileTab) => void;
}) {
  return (
    <main className="flex flex-row w-full p-2 gap-2">
      {/* USER */}
      <div className="flex flex-row">
        <span className="border-2 border-highlight-high w-40 h-40 items-center justify-center text-center flex text-8xl">
          {user.avatar}
        </span>
      </div>
      {/* RECENT GAMES (all time hours) */}
      <div className="flex flex-col w-full min-h-40 h-40 max-h-40 gap-2">
        <span className="text-3xl font-bold">{user.username}</span>
        <div className="border-2 border-highlight-high w-full h-full flex flex-row gap-2 items-center">
          <ImageComponent
            src={games[0]?.data.image}
            alt={games[0]?.data.name}
            className="w-46 h-28 aspect-video border-r-2 border-highlight-high"
          />
          <span
            className="text-xl font-bold"
            style={{
              color: getStatusColor(games[0]?.status),
            }}
          >
            {games[0]?.data.name} [{games[0]?.playtime.hltb} ч.]
          </span>
        </div>
      </div>
    </main>
  );
}
