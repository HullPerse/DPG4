import {
  ArrowDown,
  Clock,
  Dices,
  Image,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  Signal,
} from "lucide-react";
import { lazy } from "react";

const Tabletop = lazy(() => import("@/routes/tabletop/tabletop.root"));

export const APPS = [
  {
    name: "tabletop",
    label: "Подвал",
    icon: <Dices className="size-7" />,
    component: <Tabletop />,
  },
];

export const WINDOWS = [
  {
    id: "auth",
    title: "Авторизация",
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
    icon: <Image className="size-7" />,
    size: {
      width: 840,
      height: 680,
    },
  },
  {
    id: "tabletop",
    title: "Подвал",
    icon: <Dices className="size-7" />,
    size: {
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
