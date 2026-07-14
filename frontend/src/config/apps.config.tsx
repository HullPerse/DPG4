import {
  ArrowDown,
  Clock,
  Dices,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  Server,
  Signal,
  ImageIcon,
  LibraryBig,
  Star,
  Globe,
  Volleyball,
  NotebookIcon,
  Palette,
  History,
  PaintRoller,
  Trophy,
  Shield,
} from "lucide-react";
import { lazy, type ReactNode } from "react";

const Tabletop = lazy(() => import("@/routes/tabletop/tabletop.root"));
const Library = lazy(() => import("@/routes/library/library.root"));
const Browser = lazy(() => import("@/routes/browser/browser.root"));
const Wheels = lazy(() => import("@/routes/wheels/wheels.root"));
const Notebook = lazy(() => import("@/routes/notebook/notebook.route"));
const Paint = lazy(() => import("@/routes/paint/paint.root"));
const ThemeApp = lazy(() => import("@/routes/desktop/apps/theme.app"));
const WheelHistoryApp = lazy(() => import("@/routes/desktop/apps/history.app"));
const Gambling = lazy(() => import("@/routes/gambling/gambling.root"));
const AdminApp = lazy(() => import("@/routes/desktop/apps/admin.app"));

export const WIP_COMPONENT = (
  <main className="flex h-full w-full items-center justify-center bg-background">
    <span className="text-2xl font-bold text-muted tracking-widest select-none">
      ПРИЛОЖЕНИЕ В РАЗРАБОТКЕ
    </span>
  </main>
);

export const APP_REGISTRY: Record<string, { icon: ReactNode; component?: ReactNode }> = {
  tabletop: { icon: <Dices className="size-7" />, component: <Tabletop /> },
  library: { icon: <LibraryBig className="size-7" />, component: <Library /> },
  browser: { icon: <Globe className="size-7" />, component: <Browser /> },
  allWheels: { icon: <Volleyball className="size-7" />, component: <Wheels /> },
  notepad: {
    icon: <NotebookIcon className="size-7" />,
    component: <Notebook />,
  },
  paint: { icon: <PaintRoller className="size-7" />, component: <Paint /> },
  gambling: { icon: <Trophy className="size-7" />, component: <Gambling /> },
  history: {
    icon: <History className="size-7" />,
    component: <WheelHistoryApp />,
  },
  theme: { icon: <Palette className="size-7" />, component: <ThemeApp /> },
  gamewheel: { icon: <Star className="size-7" /> },
  admin: { icon: <Shield className="size-7" />, component: <AdminApp /> },
};

export const WINDOW_ICONS: Record<string, ReactNode> = {
  auth: undefined,
  signout: undefined,
  wallpaper: <ImageIcon className="size-7" />,
  tabletop: <Dices className="size-7" />,
  library: <LibraryBig className="size-7" />,
  browser: <Globe className="size-7" />,
  allWheels: <Volleyball className="size-7" />,
  notepad: <NotebookIcon className="size-7" />,
  paint: <PaintRoller className="size-7" />,
  gambling: <Trophy className="size-7" />,
  theme: <Palette className="size-7" />,
  history: <History className="size-7" />,
  admin: <Shield className="size-7" />,
};

export const DIRECTIONS = [
  { direction: "up", label: "Наверх", icon: <MoveUp /> },
  { direction: "down", label: "Вниз", icon: <MoveDown /> },
  { direction: "left", label: "Налево", icon: <MoveLeft /> },
  { direction: "right", label: "Направо", icon: <MoveRight /> },
];

export const NETWORK = [
  { id: "server", label: "Сервер", icon: <Server /> },
  { id: "quality", label: "Соединение", icon: <Signal /> },
  { id: "downlink", label: "Пропускная способность", icon: <ArrowDown /> },
  { id: "latency", label: "Задержка", icon: <Clock /> },
];
