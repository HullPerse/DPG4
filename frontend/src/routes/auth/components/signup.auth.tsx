import UserApi from "@/api/user.api";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { COLORS, ICONS } from "@/config/auth.config";
import { useUserStore } from "@/store/user.store";
import { Box, CircleX, Square, SquareCheckBig } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WindowError } from "@/components/shared/error.component";
import { userSchema } from "@/lib/zod.utils";
import { useDataStore } from "@/store/data.store";
import Image from "@/components/shared/image.component";

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
  const [steam, setSteam] = useState<string>("");


  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [robotStep, setRobotStep] = useState<number>(0);

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
      steam,
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
  }, [
    username,
    password,
    avatar,
    color,
    steam,
    setRegister,
    navigate,
    setLoggedIn,
    setConnected,
    login,

  ]);

  const clearError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };

      if (field in newErrors) {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const verificationFunction = () => {
    if (robotStep != 0) return setRobotStep(3);

    setRobotStep(1);

    setTimeout(() => {
      setRobotStep(2);
    }, 4000);

    setTimeout(() => {
      setRobotStep(3);
    }, 10000);
  };

  const getVerification = () => {
    const verificationComponent = {
      0: (
        <Square
          className="size-14 cursor-pointer text-text opacity-75 hover:opacity-100"
          onClick={verificationFunction}
        />
      ),
      1: (
        <div className="relative">
          <Square className="size-14 text-text" />
          <SmallLoader className="absolute top-1/2 right-1/2 size-8 translate-x-1/2 -translate-y-1/2" />
        </div>
      ),
      2: (
        <div className="relative">
          <Square className="size-14 text-text" />
          <Image
            src="./src/assets/trollface.png"
            alt="trollface"
            className="absolute top-1/2 right-1/2 size-8 translate-x-1/2 -translate-y-1/2"
          />
        </div>
      ),
      3: <SquareCheckBig className="size-14 text-green-500" />,
    };

    const verificationText = {
      0: "Подтвердите, что вы не робот",
      1: "Обработка данных, пожалуйста подождите",
      2: "Тебя затроллили, нубик",
      3: "Вы успешно прошли проверку",
    };

    return {
      component:
        verificationComponent[robotStep as keyof typeof verificationComponent],
      text: verificationText[robotStep as keyof typeof verificationText],
    };
  };

  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при соединении с сервером")}
        icon={<CircleX className="size-28 animate-pulse text-red-500" />}
        refresh={refetch}
        button
      />
    );

  if (isLoading) return <WindowLoader />;

  return (
    <main
      className="flex h-full w-full flex-col items-center gap-3 px-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          return handleAuth();
        }
      }}
    >
      <Box className="h-30 min-h-30 w-30 min-w-30" />

      {errors.general && (
        <div className="w-full rounded border border-red-500 bg-red-500/20 p-2">
          <p className="text-center text-sm text-red-500">{errors.general}</p>
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
          <p className="mt-1 text-xs text-red-500">{errors.username}</p>
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
          <p className="mt-1 text-xs text-red-500">{errors.password}</p>
        )}
      </div>

      <div className="w-full">
        <Input
          type="text"
          placeholder="Steam Логин"
          min={4}
          className={`w-full ${errors.steam ? "border-red-500" : ""}`}
          value={steam}
          onChange={(e) => {
            setSteam(e.target.value);
            clearError("steam");
          }}
        />
        {errors.steam && (
          <p className="mt-1 text-xs text-red-500">{errors.steam}</p>
        )}
      </div>

      <div className="w-full">
        <section className="flex flex-row flex-wrap items-center justify-center gap-2">
          {ICONS.map((icon) => {
            const isUsed = usedItems.avatars.has(icon);

            return (
              <Button
                key={icon}
                size="icon"
                variant="ghost"
                className={`rounded border-2 p-6 transition-all duration-100 select-none ${avatar === icon ? "border-primary bg-primary/50" : "transparent cursor-pointer"} ${errors.avatar ? "border-red-500" : ""}`}
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
          <p className="mt-1 text-center text-xs text-red-500">
            {errors.avatar}
          </p>
        )}
      </div>

      <div className="w-full">
        <section className="flex flex-row flex-wrap items-center justify-center gap-2">
          {COLORS.map((item) => {
            const isUsed = usedItems.colors.has(item);

            return (
              <Button
                key={item}
                size="icon"
                variant="ghost"
                className={`rounded border-2 p-4 transition-all duration-100 select-none ${color === item ? "border-primary" : "transparent cursor-pointer"} ${errors.color ? "border-red-500" : ""}`}
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
          <p className="mt-1 text-center text-xs text-red-500">
            {errors.color}
          </p>
        )}
      </div>

      {/* ROBOT VERIFICATION */}
      <section className="flex h-fit min-h-16 w-full flex-row items-center gap-1 rounded border-2 border-highlight-high bg-background p-1 text-wrap transition-all duration-300">
        <div>{getVerification().component}</div>
        <span>{getVerification().text}</span>
      </section>

      <Button
        variant="success"
        className="w-full py-5"
        disabled={
          loading ||
          !username ||
          !password ||
          !avatar ||
          !color ||
          !steam ||
          password.length < 4 ||
          robotStep != 3
        }
        onClick={handleAuth}
      >
        {loading || isLoading ? <SmallLoader /> : "Создать аккаунт"}
      </Button>
      <Button
        variant="link"
        className="text-xs text-text"
        onClick={() => setRegister(false)}
      >
        Войти в аккаунт
      </Button>
    </main>
  );
}
