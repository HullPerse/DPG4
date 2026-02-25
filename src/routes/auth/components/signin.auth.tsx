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
}: {
  setRegister: (value: boolean) => void;
}) {
  const login = useUserStore((state) => state.login);
  const setLoggedIn = useUserStore((state) => state.setLoggedIn);
  const setConnected = useDataStore((state) => state.setConnected);
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      await login(username.toUpperCase(), password).then(() => {
        setLoggedIn(true);
        setConnected(true);
        navigate({
          to: "/",
          replace: true,
        });
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <main
      className="flex flex-col w-full h-full items-center p-2 gap-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          return handleAuth();
        }
      }}
    >
      <Box className="min-h-30 min-w-30 h-30 w-30" />

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

      <Button
        variant="success"
        className="w-full py-5"
        onClick={handleAuth}
        disabled={loading || !username || !password}
      >
        {loading ? <SmallLoader /> : "Войти"}
      </Button>
      <Button
        variant="link"
        className="text-text text-xs"
        onClick={() => setRegister(true)}
      >
        Создать аккаунт
      </Button>
    </main>
  );
}
