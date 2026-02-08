import { Dices, Image } from "lucide-react";
import { lazy } from "react";

const Tabletop = lazy(() => import("@/routes/tabletop/tabletop.root"));

export const APPS = [
  {
    name: "tabletop",
    label: "Игровое поле",
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
    title: "Игровое поле",
    icon: <Dices className="size-7" />,
    size: {
      width: 840,
      height: 680,
    },
  },
];
