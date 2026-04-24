import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useDataStore } from "@/store/data.store";
import { useUserStore } from "@/store/user.store";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { TimeDisplay } from "../../desktop/components/timer.desktop";

export default function Signpout() {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const login = useUserStore((state) => state.login);
  const setLoggedIn = useUserStore((state) => state.setLoggedIn);
  const wallpaperData = useDataStore((state) => state.wallpaper);

  const clearUser = useUserStore((state) => state.clear);
  const clearData = useDataStore((state) => state.clear);

  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getWallpaper = async () => {
    const wallpaper = await invoke<string>("get_wallpaper_by_name", {
      name: wallpaperData,
    });

    const dataUrl = await invoke<string>("get_wallpaper_data", {
      path: wallpaper,
    });

    if (dataUrl) return setWallpaper(dataUrl);

    return setWallpaper(null);
  };

  useEffect(() => {
    getWallpaper();
  }, []);

  const handleAuth = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await login(user.username.toUpperCase(), password).then(() => {
        setLoggedIn(true);
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <main
      className="relative h-screen w-screen"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          return handleAuth();
        }
      }}
    >
      <section
        className="h-full w-full blur"
        style={{
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <section className="absolute top-1/2 right-1/2 flex translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-col items-center">
            <TimeDisplay time={time} />
          </div>
        </div>

        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-highlight-high bg-card p-4">
          <span className="text-6xl">{user?.avatar}</span>
        </div>
        <span className="text-xl font-bold text-text drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
          {user?.username}
        </span>
        <div className="flex w-full flex-row items-center gap-1">
          <Input
            autoFocus
            type="password"
            placeholder="Пароль"
            className="border-highlight-high bg-card text-text focus:border-highlight-high"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="success"
            size="icon"
            className="h-11 w-11 border-2 border-highlight-high bg-card hover:border-green-500"
            disabled={loading}
            onClick={handleAuth}
          >
            {loading ? <SmallLoader /> : <ChevronRight />}
          </Button>
        </div>
        <Button
          variant="link"
          className="text-xs font-bold text-text underline"
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();

            document.cookie.split(";").forEach((c) => {
              document.cookie =
                c.trim().split("=")[0] +
                "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            });
            clearData();
            clearUser();
            setLoggedIn(false);
            logout();
          }}
        >
          Выйти из аккаунта
        </Button>
      </section>
    </main>
  );
}
