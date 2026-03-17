import LibraryTab from "@/routes/library/tabs/library.tab";
import PresetsTab from "@/routes/library/tabs/presets.tab";

export const libraryTabs = [
  { value: "presets", label: "Пресеты", component: <PresetsTab /> },
  { value: "library", label: "Библиотека", component: <LibraryTab /> },
  { value: "community", label: "Сообщество", component: <></> },
];

export const STATUSES = [
  {
    name: "PLAYING",
    label: "В ПРОЦЕССЕ",
  },
  {
    name: "COMPLETED",
    label: "ПРОЙДЕНО",
  },
  {
    name: "DROPPED",
    label: "ДРОПНУТО",
  },
  {
    name: "REROLLED",
    label: "РЕРОЛЬНУТО",
  },
];
