import UserApi from "@/api/user.api";
import {
  saveHangmanState,
  joinHangman,
  playHangman,
  getStreak,
  getHangman,
} from "@/api/hangman.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import HangMan from "@/components/svg/handgman.component";
import { useUserStore } from "@/store/user.store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const RUSSIAN_LETTERS = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

const userApi = new UserApi();

function WordleTab() {
  const user = useUserStore((s) => s.user);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(
    new Set([" ", "-"]),
  );
  const [wrongLetters, setWrongLetters] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(
    "playing",
  );

  const guessedRef = useRef(guessedLetters);
  const wrongRef = useRef(wrongLetters);
  guessedRef.current = guessedLetters;
  wrongRef.current = wrongLetters;

  const queryClient = useQueryClient();

  const {
    data: record,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["hangman", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      if (user.hangman) return getHangman(user.id);
      return joinHangman(user.id);
    },
    enabled: !!user?.id,
    refetchOnMount: "always",
  });

  const { data: streakData } = useQuery({
    queryKey: ["hangmanStreak", user?.id],
    queryFn: async () => {
      if (!user?.id) return { streak: 0 };
      return getStreak(user.id);
    },
    enabled: !!user?.id,
  });

  const streak = streakData?.streak ?? 0;

  useEffect(() => {
    if (!record) return;
    if (record.state === "won") setGameStatus("won");
    else if (record.state === "lost") setGameStatus("lost");
  }, [record]);

  useEffect(() => {
    if (!record) return;
    if (record.guessedLetters?.length || record.wrongLetters?.length) {
      setGuessedLetters(new Set([" ", "-", ...record.guessedLetters]));
      setWrongLetters(record.wrongLetters);
    }
  }, [record]);

  useEffect(() => {
    return () => {
      if (gameStatus === "playing" && user?.id) {
        saveHangmanState(user.id, [...guessedRef.current], wrongRef.current);
      }
    };
  }, []);

  const playMutation = useMutation({
    mutationFn: async ({ won }: { won: boolean }) => {
      const uid = useUserStore.getState().user?.id;
      if (!uid) return;
      await playHangman(uid, won, [...guessedRef.current], wrongRef.current);
      if (won) await userApi.scoreUser(uid, 5);
      await userApi.changeHangman(uid, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hangmanStreak", user?.id] });
      queryClient.removeQueries({ queryKey: ["hangman", user?.id] });
    },
  });

  const word = record?.word ?? "";
  const wordUpper = word.toUpperCase();
  const maxErrors = useMemo(
    () => 6 + Math.max(0, Math.ceil((word.length - 6) / 2)),
    [word],
  );

  const isFinished = gameStatus === "won" || gameStatus === "lost";

  const handleLetter = useCallback(
    async (letter: string) => {
      if (gameStatus !== "playing") return;

      const upperLetter = letter.toUpperCase();
      if (
        guessedRef.current.has(upperLetter) ||
        wrongRef.current.includes(upperLetter)
      )
        return;

      const isWin = wordUpper.includes(upperLetter);

      if (isWin) {
        const next = new Set(guessedRef.current);
        next.add(upperLetter);
        guessedRef.current = next;
        setGuessedLetters(next);

        try {
          const updated = await saveHangmanState(
            user!.id,
            [...next],
            wrongRef.current,
          );
          queryClient.setQueryData(["hangman", user!.id], updated);
        } catch {
          /* ignore */
        }

        if (wordUpper.split("").every((ch) => next.has(ch))) {
          setGameStatus("won");
          playMutation.mutate({ won: true });
        }
      } else {
        const next = [...wrongRef.current, upperLetter];
        wrongRef.current = next;
        setWrongLetters(next);

        try {
          const updated = await saveHangmanState(
            user!.id,
            [...guessedRef.current],
            next,
          );
          queryClient.setQueryData(["hangman", user!.id], updated);
        } catch {
          /* ignore */
        }

        if (next.length >= maxErrors) {
          setGameStatus("lost");
          playMutation.mutate({ won: false });
        }
      }
    },
    [gameStatus, wordUpper, maxErrors, playMutation, user, queryClient],
  );

  const displayWord = wordUpper
    .split("")
    .map((ch) => (guessedLetters.has(ch) ? ch : "_"))
    .join(" ");

  const lettersWithDigits = useMemo(() => {
    const hasCyr = /[А-ЯЁ]/.test(wordUpper);
    const letters = hasCyr ? RUSSIAN_LETTERS : ENGLISH_LETTERS;
    return { letters: letters.split(""), digits: DIGITS.split("") };
  }, [wordUpper]);

  if (isLoading) return <WindowLoader />;
  if (isError) {
    return (
      <WindowError
        error={new Error("Произошла ошибка при соединении с сервером")}
        icon={<CircleX className="size-28 animate-pulse text-red-500" />}
      />
    );
  }

  if (!record) {
    return (
      <main className="flex flex-col w-full h-full gap-2 p-2 items-center justify-center">
        <span className="text-lg font-bold">Не удалось загрузить игру</span>
        <Button variant="default" onClick={() => refetch()}>
          Повторить
        </Button>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-full h-full gap-2 p-2">
      <div className="flex items-center justify-between px-2 text-sm text-muted">
        <span>Побед: {streak}</span>
        <span>
          Ошибок: {wrongLetters.length}/{maxErrors}
        </span>
      </div>

      <section className="flex flex-1 items-center justify-center bg-background border-2 border-highlight-high">
        <HangMan wrongLetters={wrongLetters} />
      </section>

      <section className="text-center text-2xl font-bold tracking-widest">
        {displayWord}
      </section>

      <section className="relative">
        {isFinished ? (
          <div className="flex flex-col items-center gap-2 py-4 px-2 bg-black/80 border-2 border-highlight-high">
            {gameStatus === "won" ? (
              <span className="text-green-400 text-lg font-bold">
                ПОБЕДА! +5
              </span>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-red-400 text-lg font-bold">
                  ПОРАЖЕНИЕ
                </span>
                <span className="text-muted text-sm">Слово: {word}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 p-3 bg-background border-2 border-highlight-high rounded-lg shadow-sm">
            <div className="grid grid-cols-10 gap-1">
              {lettersWithDigits.digits.map((digit) => {
                const isCorrect = guessedLetters.has(digit);
                const isWrong = wrongLetters.includes(digit);
                const isUsed = isCorrect || isWrong;
                return (
                  <Button
                    key={digit}
                    variant={
                      isCorrect ? "success" : isWrong ? "error" : "default"
                    }
                    size="sm"
                    disabled={isUsed}
                    onClick={() => handleLetter(digit)}
                    className="font-bold border-2 text-xl border-highlight-high h-14 w-14"
                  >
                    {digit}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {lettersWithDigits.letters.map((letter) => {
                const upper = letter.toUpperCase();
                const isCorrect = guessedLetters.has(upper);
                const isWrong = wrongLetters.includes(upper);
                const isUsed = isCorrect || isWrong;
                return (
                  <Button
                    key={letter}
                    variant={
                      isCorrect ? "success" : isWrong ? "error" : "default"
                    }
                    disabled={isUsed}
                    onClick={() => handleLetter(letter)}
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
