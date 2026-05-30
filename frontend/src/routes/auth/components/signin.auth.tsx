import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useUserStore } from "@/store/user.store";
import { Box } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDataStore } from "@/store/data.store";

export default function Signin({
  setRegister,
  serverAvailable,
}: {
  setRegister: (value: boolean) => void;
  serverAvailable: boolean;
}) {
  const login = useUserStore((state) => state.login);
  const setLoggedIn = useUserStore((state) => state.setLoggedIn);
  const setConnected = useDataStore((state) => state.setConnected);
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      await login(username.toUpperCase(), password).then(() => {
        setLoggedIn(true);
        setConnected(true);
        navigate({
          to: "/",
          replace: true,
        });
      });
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Не удалось войти";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <main
      className="flex h-full w-full flex-col items-center gap-2 p-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          return handleAuth();
        }
      }}
    >
      <Box className="h-30 min-h-30 w-30 min-w-30" />

      <Input
        type="text"
        placeholder="Имя пользователя"
        className="w-full"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
      />
      <Input
        type="password"
        placeholder="Пароль"
        className="w-full"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p className="text-love w-full text-center text-xs">{error}</p>
      )}

      {!serverAvailable && !error && (
        <p className="text-muted w-full text-center text-xs">
          Сервер offline — вход будет доступен после запуска
        </p>
      )}

      <Button
        variant="success"
        className="w-full py-5"
        onClick={handleAuth}
        disabled={loading || !username || !password}
      >
        {loading ? <SmallLoader /> : "Войти"}
      </Button>
      {serverAvailable && (
        <Button
          variant="link"
          className="text-xs text-text"
          onClick={() => setRegister(true)}
        >
          Создать аккаунт
        </Button>
      )}
    </main>
  );
}
