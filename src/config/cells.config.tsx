import PigSvg from "@/components/svg/pig.component";
import PoopSvg from "@/components/svg/poop.component";
import CatSvg from "@/components/svg/cat.component";

export const cellsConfig = {
  difficulty: [
    {
      name: "easy",
      label: "Лёгкий",
      color: "rgba(119, 221, 119, 1)",
    },
    {
      name: "medium",
      label: "Средний",
      color: "rgba(255, 255, 125, 1)",
    },
    {
      name: "medium-hard",
      label: "Сложноватый",
      color: "rgba(252, 178, 114, 1)",
    },
    {
      name: "hard",
      label: "Сложный",
      color: "rgba(255, 105, 105, 1)",
    },
    {
      name: "hell",
      label: "Адский",
      color: "rgba(176, 79, 79, 1)",
    },
    {
      name: "core",
      label: "Сердце",
      color: "rgba(255, 0, 0, 1)",
    },
  ],
  type: [
    {
      name: "game",
      label: "Игра",
    },
    {
      name: "preset",
      label: "Пресет",
    },
    {
      name: "steam",
      label: "Стим",
    },
    {
      name: "watch",
      label: "Просмотр",
    },
  ],
  status: [
    {
      name: "poop",
      icon: <PoopSvg />,
      description: "Попа",
    },
    {
      name: "pig",
      icon: <PigSvg />,
      description: "Свинья",
    },
    {
      name: "cat",
      icon: <CatSvg />,
      description: "Котик",
    },
  ],
  arrowType: [
    {
      name: "none",
      label: "Не показывать",
    },
    {
      name: "all",
      label: "Все",
    },
    {
      name: "arrows",
      label: "Только стрелки",
    },
    {
      name: "icons",
      label: "Только иконки",
    },
    {
      name: "ladders",
      label: "Только лестницы",
    },
    {
      name: "snakes",
      label: "Только змейки",
    },
  ],
};
