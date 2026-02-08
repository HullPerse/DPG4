import { Image } from "lucide-react";

export const APPS = [];

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
];
