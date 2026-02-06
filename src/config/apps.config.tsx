import { DoorOpen } from "lucide-react";

export const APPS = [
  {
    name: "signout",
    label: "Выход",
    icon: <DoorOpen />,
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
];
