import LibraryTab from "@/routes/library/tabs/library.tab";
import PresetsTab from "@/routes/library/tabs/presets.tab";
import { GameStatus } from "@/types/games";
import { Ban, Check, Play, RefreshCcw } from "lucide-react";

export const libraryTabs = [
  { value: "presets", label: "Пресеты", component: <PresetsTab /> },
  { value: "library", label: "Библиотека", component: <LibraryTab /> },
  { value: "community", label: "Сообщество", component: <></> },
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
