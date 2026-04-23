import { memo } from "react";

//Моя реклама
//Новая реклама ->
// 1. выбрать картинку
// 2. выбрать текст
// 3. оплата публикации + публикация
//
// 1. в главном меню рандомный попап рекламный с рекламой
// 2. закрыть можно только через 10 секунд (показать таймер)
//
function AdTab() {
  return <main className="flex flex-col gap-2 w-full h-full"></main>;
}

export default memo(AdTab);
