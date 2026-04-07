import { GameStatus } from "@/types/games";
import { Ban, Check, Play, RefreshCcw } from "lucide-react";
import { lazy } from "react";

const PresetsTab = lazy(() => import("@/routes/library/tabs/presets.tab"));
const LibraryTab = lazy(() => import("@/routes/library/tabs/library.tab"));
const ProfileTab = lazy(() => import("@/routes/library/tabs/profile.tab"));

export const libraryTabs = [
  { value: "presets", label: "Пресеты", component: <PresetsTab />, show: true },
  {
    value: "library",
    label: "Библиотека",
    component: <LibraryTab />,
    show: true,
  },
  {
    value: "profile",
    label: "Профиль",
    component: <ProfileTab />,
    show: false,
  },
  { value: "community", label: "Сообщество", component: <></>, show: true },
];

export const gameButtons: {
  value: GameStatus;
  icon: React.ReactNode;
  description: string;
  priority: number;
}[] = [
  { value: "COMPLETED", icon: <Check />, description: "ПРОЙДЕНО", priority: 1 },
  { value: "PLAYING", icon: <Play />, description: "В ПРОЦЕССЕ", priority: 2 },
  { value: "DROPPED", icon: <Ban />, description: "ДРОПНУТО", priority: 3 },
  {
    value: "REROLLED",
    icon: <RefreshCcw />,
    description: "РЕРОЛЛ",
    priority: 4,
  },
];

export const profileTabs = [
  { value: "profile", label: "Профиль" },
  { value: "library", label: "Игры" },
  { value: "inventory", label: "Инвентарь" },
  { value: "reviews", label: "Отзывы" },
  { value: "trade", label: "Обмен", disabled: true },
  { value: "chat", label: "Чат", disabled: true },
];
