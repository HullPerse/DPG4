import { useCallback, useEffect, useRef, useState } from "react";
import { useDataStore } from "@/store/data.store";

const DEBOUNCE_MS = 400;

export function useNotepad() {
  const stored = useDataStore((state) => state.notepad);
  const setStored = useDataStore((state) => state.setNotepad);
  const [text, setText] = useState(stored);
  const textRef = useRef(text);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  textRef.current = text;

  useEffect(() => {
    if (timerRef.current) return;
    if (stored !== textRef.current) {
      setText(stored);
    }
  }, [stored]);

  const persist = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStored(value);
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [setStored],
  );

  const onChange = useCallback(
    (value: string) => {
      setText(value);
      persist(value);
    },
    [persist],
  );

  const setTextAndPersist = useCallback(
    (value: string) => {
      setText(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      setStored(value);
    },
    [setStored],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        setStored(textRef.current);
      }
    };
  }, [setStored]);

  return { text, onChange, setTextAndPersist };
}
