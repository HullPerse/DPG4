import { Activity, Gift, Grid3x3, LayoutDashboard, LogOut, ScrollText, Search, Terminal } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getAdminUser, logout } from "@/lib/auth";
import { resourceIcons } from "@/config/resourceIcons";
import { cn } from "@/lib/utils";
import type { AdminSchema } from "@/types";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-iris/15 text-primary border-iris border-l-2"
      : "text-muted hover:bg-highlight-medium hover:text-text border-l-2 border-transparent",
  );

export function AdminShell({ schema }: { schema: AdminSchema }) {
  const user = getAdminUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="bg-background flex h-full max-h-full overflow-hidden">
      <aside className="border-highlight-high bg-card flex h-full w-56 shrink-0 flex-col overflow-hidden border-r-2">
        <div className="border-highlight-high border-b-2 px-4 py-4">
          <div className="text-muted text-[10px] font-bold tracking-widest uppercase">
            DPG Admin
          </div>
          <div className="text-primary mt-0.5 text-lg font-bold">Панель</div>
          {user && (
            <div className="text-muted mt-1 truncate text-xs">{user.username}</div>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-2">
          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="size-4" />
            Главная
          </NavLink>
          <NavLink to="/health" className={navLinkClass}>
            <Activity className="size-4" />
            Мониторинг
          </NavLink>
          <NavLink to="/grant-item" className={navLinkClass}>
            <Gift className="size-4" />
            Выдать предмет
          </NavLink>
          <NavLink to="/cells-board" className={navLinkClass}>
            <Grid3x3 className="size-4" />
            Поле (cells)
          </NavLink>
          <NavLink to="/console" className={navLinkClass}>
            <Terminal className="size-4" />
            Консоль
          </NavLink>
          <NavLink to="/logs" className={navLinkClass}>
            <ScrollText className="size-4" />
            Логи
          </NavLink>
          <NavLink to="/search" className={navLinkClass}>
            <Search className="size-4" />
            Поиск
          </NavLink>
          <div className="border-highlight-high text-muted mx-3 my-2 border-t pt-2 text-[10px] font-bold tracking-wider uppercase">
            Таблицы
          </div>
          {Object.entries(schema.tables).map(([name, meta]) => {
            const Icon = resourceIcons[name];
            return (
              <NavLink key={name} to={`/${name}`} className={navLinkClass}>
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                <span className="truncate">{meta.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="text-muted hover:text-love border-highlight-high flex items-center gap-2 border-t-2 px-4 py-3 text-sm transition-colors"
        >
          <LogOut className="size-4" />
          Выйти
        </button>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
