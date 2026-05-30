import {
  Bookmark,
  Brush,
  Gamepad2,
  Gavel,
  Grid3x3,
  MessageCircle,
  Megaphone,
  Package,
  Store,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export const resourceIcons: Record<string, LucideIcon> = {
  users: Users,
  games: Gamepad2,
  presets: Bookmark,
  items: Package,
  inventory: Package,
  market: Store,
  activity: TrendingUp,
  chats: MessageCircle,
  rules: Gavel,
  ads: Megaphone,
  drawings: Brush,
  cells: Grid3x3,
};
