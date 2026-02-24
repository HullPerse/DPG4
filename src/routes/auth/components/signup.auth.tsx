import UserApi from "@/api/user.api";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { COLORS, ICONS } from "@/config/auth.config";
import { useUserStore } from "@/store/user.store";
import { Box, CircleX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WindowError } from "@/components/shared/error.component";
import { userSchema } from "@/lib/zod.utils";
import { useDataStore } from "@/store/data.store";

const userApi = new UserApi();

export default function Signup({
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
  const [avatar, setAvatar] = useState<string>("");
  const [color, setColor] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["userAuth"],
    queryFn: async () => {
      return await userApi.getExisting();
    },
  });

  const usedItems = useMemo(() => {
    if (!data) return { colors: new Set(), avatars: new Set() };

    const colors = new Set(data.map((user) => user.color));
    const avatars = new Set(data.map((user) => user.avatar));

    return { colors, avatars };
  }, [data]);

  const handleAuth = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const validationResult = userSchema.safeParse({
      username,
      password,
      avatar,
      color,
    });

    //error handling
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    //create user
    await userApi
      .create(validationResult.data as any)
      .catch((error) => {
        console.error(error);
        setErrors({
          general: "Ошибка при создании пользователя. Попробуйте еще раз.",
        });
      })
      .finally(() => {
        setLoggedIn(true);
        setConnected(true);
        login(validationResult.data.username, validationResult.data.password);
        setRegister(false);
        setLoading(false);
        navigate({
          to: "/",
          replace: true,
        });
      });
  }, [username, password, avatar, color, setRegister]);

  const clearError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };

      if (field in newErrors) {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при соединении с сервером")}
        icon={<CircleX className="animate-pulse size-28 text-red-500" />}
        refresh={refetch}
        button
      />
    );

  if (isLoading) return <WindowLoader />;

  return (
    <main
      className="flex flex-col w-full h-full items-center px-2 gap-3"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          return handleAuth();
        }
      }}
    >
      <Box className="min-h-30 min-w-30 h-30 w-30" />

      {errors.general && (
        <div className="w-full bg-red-500/20 border border-red-500 rounded p-2">
          <p className="text-red-500 text-sm text-center">{errors.general}</p>
        </div>
      )}

      <div className="w-full">
        <Input
          type="text"
          placeholder="Имя пользователя"
          className={`w-full ${errors.username ? "border-red-500" : ""}`}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            clearError("username");
          }}
          autoFocus
        />
        {errors.username && (
          <p className="text-red-500 text-xs mt-1">{errors.username}</p>
        )}
      </div>

      <div className="w-full">
        <Input
          type="password"
          placeholder="Пароль"
          min={4}
          className={`w-full ${errors.password ? "border-red-500" : ""}`}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError("password");
          }}
        />
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password}</p>
        )}
      </div>
      <div className="w-full">
        <section className="flex flex-row flex-wrap gap-2 items-center justify-center">
          {ICONS.map((icon) => {
            const isUsed = usedItems.avatars.has(icon);

            return (
              <Button
                key={icon}
                size="icon"
                variant="ghost"
                className={`border-2 rounded p-6 transition-all duration-100 select-none
                ${avatar === icon ? "bg-primary/50 border-primary" : "transparent cursor-pointer"}
                  ${errors.avatar ? "border-red-500" : ""}`}
                style={{
                  scale: avatar === icon ? 1.2 : 1,
                }}
                onClick={() => {
                  setAvatar(icon);
                  clearError("avatar");
                }}
                disabled={isUsed}
              >
                <span className="text-2xl">{icon}</span>
              </Button>
            );
          })}
        </section>
        {errors.avatar && (
          <p className="text-red-500 text-xs mt-1 text-center">
            {errors.avatar}
          </p>
        )}
      </div>

      <div className="w-full">
        <section className="flex flex-row flex-wrap gap-2 items-center justify-center">
          {COLORS.map((item) => {
            const isUsed = usedItems.colors.has(item);

            return (
              <Button
                key={item}
                size="icon"
                variant="ghost"
                className={`border-2 rounded p-4 transition-all duration-100 select-none
                 ${color === item ? "border-primary" : "transparent cursor-pointer"}
                 ${errors.color ? "border-red-500" : ""}`}
                style={{
                  scale: color === item ? 1.2 : 1,
                  backgroundColor: item,
                }}
                onClick={() => {
                  setColor(item);
                  clearError("color");
                }}
                disabled={isUsed}
              />
            );
          })}
        </section>
        {errors.color && (
          <p className="text-red-500 text-xs mt-1 text-center">
            {errors.color}
          </p>
        )}
      </div>

      <Button
        variant="success"
        className="w-full py-5"
        disabled={
          loading ||
          !username ||
          !password ||
          !avatar ||
          !color ||
          password.length < 4
        }
        onClick={handleAuth}
      >
        {loading || isLoading ? <SmallLoader /> : "Создать аккаунт"}
      </Button>
      <Button
        variant="link"
        className="text-text text-xs"
        onClick={() => setRegister(false)}
      >
        Войти в аккаунт
      </Button>
    </main>
  );
}
