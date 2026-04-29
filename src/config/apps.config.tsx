import {
  ArrowDown,
  Clock,
  Dices,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  Signal,
  ImageIcon,
  LibraryBig,
  Star,
  Globe,
  Volleyball,
  NotebookIcon,
  Timer,
  Palette,
  History,
  MessageSquare,
} from "lucide-react";
import { lazy } from "react";

const Tabletop = lazy(() => import("@/routes/tabletop/tabletop.root"));
const Library = lazy(() => import("@/routes/library/library.root"));
const Browser = lazy(() => import("@/routes/browser/browser.root"));
const Wheels = lazy(() => import("@/routes/wheels/wheels.root"));
const Notebook = lazy(() => import("@/routes/notebook/notebook.route"));
const ThemeApp = lazy(() => import("@/routes/desktop/apps/theme.app"));
const WheelHistoryApp = lazy(() => import("@/routes/desktop/apps/history.app"));
const GlobalChatApp = lazy(() => import("@/routes/desktop/apps/chat.app"));

export const APPS = [
  {
    name: "tabletop",
    label: "Подвал",
    icon: <Dices className="size-7" />,
    component: <Tabletop />,
    priority: 1,
  },
  {
    name: "library",
    label: "Библиотека",
    icon: <LibraryBig className="size-7" />,
    component: <Library />,
    priority: 2,
  },
  {
    name: "browser",
    label: "Браузер",
    icon: <Globe className="size-7" />,
    component: <Browser />,
    priority: 3,
  },
  {
    name: "allWheels",
    label: "Все Колёса",
    icon: <Volleyball className="size-7" />,
    component: <Wheels />,
    priority: 4,
  },
  {
    name: "notepad",
    label: "Заметки",
    icon: <NotebookIcon className="size-7" />,
    component: <Notebook />,
    priority: 5,
  },
  {
    name: "howlongtobeat",
    label: "HLTB",
    icon: <Timer className="size-7" />,
    link: "https://howlongtobeat.com/",
    type: "window" as const,
    priority: 6,
  },

  {
    name: "gamewheel",
    label: "Колесо Игр",
    link: "https://gamegauntlets.com/",
    icon: <Star className="size-7" />,
    type: "browser" as const,
    priority: 10,
  },
  {
    name: "theme",
    label: "Тема",
    icon: <Palette className="size-7" />,
    component: <ThemeApp />,
    priority: 8,
  },
  {
    name: "wheelHistory",
    label: "История колеса",
    icon: <History className="size-7" />,
    component: <WheelHistoryApp />,
    priority: 7,
  },
  {
    name: "globalChat",
    label: "Общий чат",
    icon: <MessageSquare className="size-7" />,
    component: <GlobalChatApp />,
    priority: 9,
  },
];

export const WINDOWS = [
  {
    id: "auth",
    title: "Авторизация",
    overflow: true,
    size: {
      width: 640,
      height: 480,
    },
    disabled: {
      minimize: true,
      close: true,
    },
  },
  {
    id: "signout",
    title: "Выход",
    size: {
      width: 640,
      height: 480,
    },
  },
  {
    id: "wallpaper",
    title: "Обои",
    icon: <ImageIcon className="size-7" />,
    size: {
      width: 840,
      height: 680,
    },
  },
  {
    id: "tabletop",
    title: "Подвал",
    icon: <Dices className="size-7" />,
    overflow: true,
    size: {
      minWidth: 840,
      minHeight: 680,
      width: 840,
      height: 680,
    },
  },
  {
    id: "library",
    title: "Библиотека",
    icon: <LibraryBig className="size-7" />,
    size: {
      minWidth: 910,
      minHeight: 680,
      width: 910,
      height: 680,
    },
  },
  {
    id: "browser",
    title: "Браузер",
    icon: <Globe className="size-7" />,
    size: {
      minWidth: 910,
      minHeight: 680,
      width: 910,
      height: 680,
    },
  },
  {
    id: "allWheels",
    title: "Все Колёса",
    icon: <Volleyball className="size-7" />,
    size: {
      minWidth: 910,
      minHeight: 680,
      width: 910,
      height: 680,
    },
  },
  {
    id: "notepad",
    title: "Заметки",
    icon: <NotebookIcon className="size-7" />,
    size: {
      minWidth: 910,
      minHeight: 680,
      width: 910,
      height: 680,
    },
  },
  {
    id: "theme",
    title: "Редактор темы",
    icon: <Palette className="size-7" />,
    size: {
      width: 500,
      height: 600,
    },
  },
  {
    id: "wheelHistory",
    title: "История колеса",
    icon: <History className="size-7" />,
    size: {
      width: 600,
      height: 700,
    },
  },
  {
    id: "globalChat",
    title: "Общий чат",
    icon: <MessageSquare className="size-7" />,
    size: {
      minWidth: 400,
      minHeight: 500,
      width: 500,
      height: 600,
    },
  },
];

export const DIRECTIONS = [
  {
    direction: "up",
    label: "Наверх",
    icon: <MoveUp />,
  },
  {
    direction: "down",
    label: "Вниз",
    icon: <MoveDown />,
  },
  {
    direction: "left",
    label: "Налево",
    icon: <MoveLeft />,
  },
  {
    direction: "right",
    label: "Направо",
    icon: <MoveRight />,
  },
];

export const NETWORK = [
  {
    id: "quality",
    label: "Соединение",
    icon: <Signal />,
  },
  {
    id: "downlink",
    label: "Пропускная способность",
    icon: <ArrowDown />,
  },
  {
    id: "latency",
    label: "Задержка",
    icon: <Clock />,
  },
];
