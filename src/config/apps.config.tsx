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
} from "lucide-react";
import { lazy } from "react";

const Tabletop = lazy(() => import("@/routes/tabletop/tabletop.root"));
const Library = lazy(() => import("@/routes/library/library.root"));

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
    name: "gamewheel",
    label: "Колесо Игр",
    link: "https://gamegauntlets.com/",
    icon: <Star className="size-7" />,
    component: <Tabletop />,
    priority: 10,
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
      minWidth: 840,
      minHeight: 680,
      width: 840,
      height: 680,
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
