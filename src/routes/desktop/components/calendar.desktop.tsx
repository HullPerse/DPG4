import { Calendar } from "@/components/ui/calendar.component";
import { useDataStore } from "@/store/data.store";
import { invoke } from "@tauri-apps/api/core";
import { useClickAway } from "@uidotdev/usehooks";
import { RefObject, useEffect, useState } from "react";

export default function CalendarDesktop({
  openCalendar,
  setOpenCalendar,
}: {
  openCalendar: boolean;
  setOpenCalendar: (value: boolean) => void;
}) {
  const { currentFont, setFont } = useDataStore((state) => state);

  const [fonts, setFonts] = useState<string[]>([]);

  const clickAwayRef = useClickAway((e: Event) => {
    const target = e.target as HTMLElement;

    const timerElement = target.closest('[data-timer="true"]');
    if (timerElement) return;

    const otherWindow = target.closest('[data-calendar="true"]');
    if (!otherWindow && openCalendar) {
      setOpenCalendar(false);
    }
  });

  useEffect(() => {
    invoke<
      {
        name: string;
        path: string;
      }[]
    >("get_all_fonts").then((f) => setFonts(f.map((font) => font.name)));
  }, []);

  console.log(fonts);

  return (
    <div
      className="relative w-full h-full"
      ref={clickAwayRef as RefObject<HTMLDivElement>}
    >
      <Calendar
        className="absolute right-2 bottom-2 w-52"
        timeZone="Europe/Moscow"
      />
    </div>
  );
}
