import { Calendar } from "@/components/ui/calendar.component";
import { useClickAway } from "@uidotdev/usehooks";
import { RefObject } from "react";

export default function CalendarDesktop({
  openCalendar,
  setOpenCalendar,
  setOpenLanguage,
}: {
  openCalendar: boolean;
  setOpenCalendar: (value: boolean) => void;
  setOpenLanguage: (value: boolean) => void;
}) {
  const clickAwayRef = useClickAway((e: Event) => {
    const target = e.target as HTMLElement;

    const timerElement = target.closest('[data-timer="true"]');
    if (timerElement) return;

    const otherWindow = target.closest('[data-calendar="true"]');

    if (!otherWindow && openCalendar) {
      setOpenCalendar(false);
      setOpenLanguage(false);
    }
  });

  return (
    <div ref={clickAwayRef as RefObject<HTMLDivElement>}>
      <Calendar
        className="absolute right-2 bottom-2 w-52"
        timeZone="Europe/Moscow"
      />
    </div>
  );
}
