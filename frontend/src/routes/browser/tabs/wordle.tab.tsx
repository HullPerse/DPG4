import {
  getHangman,
  getStreak,
  joinHangman,
  playHangman,
  saveHangmanState,
} from "@/api/hangman.api";
import UserApi from "@/api/user.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import HangMan from "@/components/svg/handgman.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { HangmanRecord } from "@/types/hangman";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const userApi = new UserApi();

const RUSSIAN_LETTERS = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

type WordleType = {
  streak: number;
  word: HangmanRecord | null;
};

function WordleTab() {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["wordleTab", user?.id],
    queryFn: async (): Promise<WordleType> => {
      if (!user) return { streak: 0, word: null };

      return {
        streak: await getStreak(user?.id),
        word: user?.hangman
          ? ((await getHangman(user.id)) ?? (await joinHangman(user.id)))
          : await joinHangman(user.id),
      };
    },
    refetchOnMount: "always",
    enabled: !!user?.id,
  });

  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [letters, setLetters] = useState<Set<string>>(new Set([" ", "-"]));
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  const streak = data?.streak ?? 0;
  const isFinished = status === "won" || status === "lost";

  const word = data?.word?.word ?? "";
  const wordUpper = word.toUpperCase();

  const maxErrors = Math.min(7, 6 + Math.max(0, Math.ceil((word.length - 6) / 2)));

  const guessedRef = useRef(letters);
  const wrongRef = useRef<string[]>([]);
  guessedRef.current = letters;

  useEffect(() => {
    if (!data?.word) return;
    if (data?.word.state === "won") setStatus("won");
    else if (data?.word.state === "lost") setStatus("lost");
  }, [data?.word]);

  useEffect(() => {
    if (!data?.word) return;
    if (data?.word.guessedLetters?.length || data?.word.wrongLetters?.length) {
      setLetters(new Set([" ", "-", ...(data?.word.guessedLetters ?? [])]));
      setErrors(new Set(data?.word.wrongLetters ?? []));
    }
  }, [data?.word]);

  useEffect(() => {
    return () => {
      if (status === "playing" && user?.id) {
        saveHangmanState(user.id, [...guessedRef.current], [...errors]);
      }
    };
  }, []);

  const lettersWithDigits = (): { letters: string[]; digits: string[] } => {
    const hasRus = /[А-ЯЁ]/.test(wordUpper);
    const letters = hasRus ? RUSSIAN_LETTERS : ENGLISH_LETTERS;
    return { letters: letters.split(""), digits: DIGITS.split("") };
  };

  const displayWord = wordUpper
    .split("")
    .map((i) => (letters.has(i) ? i : "＿"))
    .join("‎");

  const playMutation = useMutation({
    mutationFn: async ({ won }: { won: boolean }) => {
      const uid = useUserStore.getState().user?.id;

      if (!uid) return;

      await playHangman(uid, won, [...guessedRef.current], [...wrongRef.current]);
      if (won) await userApi.scoreUser(uid, 5);
      await userApi.changeHangman(uid, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hangmanStreak", user?.id] });
      queryClient.removeQueries({ queryKey: ["hangman", user?.id] });
    },
  });

  const handleGuess = useCallback(
    async (letter: string) => {
      if (status !== "playing") return;

      const upperCase = letter.toUpperCase();

      if (guessedRef.current.has(upperCase) || errors.has(upperCase)) return;

      const isWin = wordUpper.includes(upperCase);

      if (isWin) {
        const next = new Set(guessedRef.current);
        next.add(upperCase);
        guessedRef.current = next;
        setLetters(next);

        const updated = await saveHangmanState(user!.id, [...next], wrongRef.current);

        queryClient.setQueryData(["hangman", user!.id], updated);

        if (wordUpper.split("").every((ch) => next.has(ch))) {
          setStatus("won");
          playMutation.mutate({ won: true });
        }
      } else {
        const next = new Set(errors);
        next.add(upperCase);
        wrongRef.current = [...next];
        setErrors(next);

        const updated = await saveHangmanState(user!.id, [...guessedRef.current], [...next]);
        queryClient.setQueryData(["hangman", user!.id], updated);

        if (next.size >= maxErrors) {
          setStatus("lost");
          playMutation.mutate({ won: false });
        }
      }
    },
    [status, wordUpper, maxErrors, playMutation, user, queryClient],
  );

  useEffect(() => {
    const wordHasCyr = /[А-ЯЁ]/.test(wordUpper);

    const onKeyDown = (e: KeyboardEvent) => {
      if (status !== "playing") return;
      if (e.repeat) return;

      const key = e.key.toUpperCase();

      const isRussian = /^[А-ЯЁ]$/.test(key);
      const isEnglish = /^[A-Z]$/.test(key);
      const isDigit = /^[0-9]$/.test(key);

      if (wordHasCyr && isEnglish) return;
      if (!wordHasCyr && isRussian) return;

      if (!isRussian && !isEnglish && !isDigit) return;

      e.preventDefault();
      handleGuess(key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, wordUpper, handleGuess]);

  if (isLoading || isFetching) return <WindowLoader />;
  if (isError) {
    return (
      <WindowError
        error={new Error("Произошла ошибка при соединении с сервером")}
        icon={<CircleX className="size-28 animate-pulse text-red-500" />}
      />
    );
  }

  const finishedComponent = () => {
    if (status === "won")
      return <span className="text-green-400 text-lg font-bold">ПОБЕДА! +5</span>;
    else if (status === "lost")
      return (
        <div className="flex flex-col items-center gap-1">
          <span className="text-red-400 text-lg font-bold">ПОРАЖЕНИЕ</span>
          <span className="text-muted text-sm">Слово: {word}</span>
        </div>
      );
  };

  return (
    <main className="flex flex-col w-full h-full gap-2 p-2">
      {/* ERRORS */}
      <section className="flex flex-row items-center justify-between p-1 text-sm text-muted">
        <span>Побед: {isNaN(streak) ? 0 : streak}</span>
        <span>
          Ошибок: {errors.size}/{maxErrors}
        </span>
      </section>
      {/* HANGMAN */}
      <section className="flex flex-1 items-center justify-center bg-background border-2 border-highlight-high">
        <HangMan wrongLetters={[...errors]} />
      </section>
      {/* WORD */}
      <section className="text-center text-2xl font-bold tracking-widest">{displayWord}</section>
      {/* KEYBOARD */}
      <section className="relative">
        {isFinished ? (
          finishedComponent()
        ) : (
          <div className="flex flex-col gap-1.5 p-3 bg-background border-2 border-highlight-high rounded-lg shadow-sm">
            <div className="flex flex-row gap-2">
              {lettersWithDigits().digits.map((digit) => {
                const isCorrect = letters.has(digit);
                const isWrong = errors.has(digit);
                const isUsed = isCorrect || isWrong;
                return (
                  <Button
                    key={digit}
                    variant={isCorrect ? "success" : isWrong ? "error" : "default"}
                    disabled={isUsed}
                    onClick={() => handleGuess(digit)}
                    className="font-bold border-2 text-xl border-highlight-high h-14 w-14"
                  >
                    {digit}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {lettersWithDigits().letters.map((letter) => {
                const upper = letter.toUpperCase();
                const isCorrect = letters.has(upper);
                const isWrong = errors.has(upper);
                const isUsed = isCorrect || isWrong;
                return (
                  <Button
                    key={letter}
                    variant={isCorrect ? "success" : isWrong ? "error" : "default"}
                    disabled={isUsed}
                    onClick={() => handleGuess(letter)}
                    className="font-bold border-2 text-xl border-highlight-high h-14 w-14"
                  >
                    {letter}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default WordleTab;
