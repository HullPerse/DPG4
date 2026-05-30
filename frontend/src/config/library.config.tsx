import { GameStatus } from "@/types/games";
import { Ban, Check, Play, RefreshCcw } from "lucide-react";
import { lazy, type ComponentType } from "react";
import type { LibraryTabs } from "@/types/library";

const PresetsTab = lazy(() => import("@/routes/library/tabs/presets.tab"));
const LibraryTab = lazy(() => import("@/routes/library/tabs/library.tab"));
const ProfileTab = lazy(() => import("@/routes/library/tabs/profile.tab"));
const InventoryTab = lazy(() => import("@/routes/library/tabs/inventory.tab"));
const FriendsTab = lazy(() => import("@/routes/library/tabs/friends.tab"));
const CommunityTab = lazy(() => import("@/routes/library/tabs/community.tab"));

export const libraryTabs: {
  value: LibraryTabs;
  label: string;
  Component: ComponentType;
  show: boolean;
}[] = [
  { value: "presets", label: "Пресеты", Component: PresetsTab, show: true },
  {
    value: "library",
    label: "Библиотека",
    Component: LibraryTab,
    show: true,
  },
  {
    value: "profile",
    label: "Профиль",
    Component: ProfileTab,
    show: false,
  },
  {
    value: "friends",
    label: "Друзья",
    Component: FriendsTab,
    show: false,
  },
  {
    value: "inventory",
    label: "Инвентарь",
    Component: InventoryTab,
    show: false,
  },
  {
    value: "community",
    label: "Сообщество",
    Component: CommunityTab,
    show: true,
  },
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
