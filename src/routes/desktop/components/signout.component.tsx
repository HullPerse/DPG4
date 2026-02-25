import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useDataStore } from "@/store/data.store";
import { useUserStore } from "@/store/user.store";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { TimeDisplay } from "./timer.desktop";

export default function Signpout() {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const login = useUserStore((state) => state.login);
  const setLoggedIn = useUserStore((state) => state.setLoggedIn);
  const wallpaperData = useDataStore((state) => state.wallpaper);

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
      className="relative w-screen h-screen"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          return handleAuth();
        }
      }}
    >
      <section
        className="w-full h-full blur"
        style={{
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <section className="absolute flex flex-col top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-col items-center">
            <TimeDisplay time={time} />
          </div>
        </div>

        <div className="w-32 h-32 border-4 border-highlight-high p-4 rounded-full flex items-center justify-center bg-card">
          <span className="text-6xl">{user?.avatar}</span>
        </div>
        <span className="text-xl font-bold text-text drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
          {user?.username}
        </span>
        <div className="w-full flex flex-row items-center gap-1">
          <Input
            autoFocus
            type="password"
            placeholder="Пароль"
            className="bg-card border-highlight-high focus:border-highlight-high text-text"
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
          variant="ghost"
          className="text-xs text-text font-bold underline"
          onClick={() => {
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
