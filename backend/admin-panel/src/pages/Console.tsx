import { useRef, useState, useEffect, type KeyboardEvent } from "react";
import { adminFetch } from "@/adminApi";

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface Entry {
  input: string;
  output: CommandResult | { error: string };
}

const PROMPT = "> ";

export function ConsolePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [entries]);

  const run = async (cmd: string) => {
    setRunning(true);
    setHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    try {
      const result = await adminFetch<CommandResult>("/api/admin/exec", {
        method: "POST",
        body: JSON.stringify({ command: cmd }),
      });
      setEntries((prev) => [...prev, { input: cmd, output: result }]);
    } catch (err) {
      setEntries((prev) => [
        ...prev,
        { input: cmd, output: { error: err instanceof Error ? err.message : "Command failed" } },
      ]);
    }
    setRunning(false);
    setInput("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim() && !running) {
      run(input.trim());
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(newIdx);
      setInput(history[newIdx]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      const newIdx = historyIdx + 1;
      if (newIdx >= history.length) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Консоль</h1>
        <span className="text-muted text-sm">
          Выполнение команд на сервере
        </span>
        <button
          type="button"
          onClick={() => { setEntries([]); setHistory([]); }}
          className="text-muted hover:text-love ml-auto text-sm transition-colors"
        >
          Очистить
        </button>
      </div>

      <div
        ref={outputRef}
        className="border-highlight-high bg-card flex-1 overflow-y-auto rounded-lg border font-mono text-sm leading-relaxed"
      >
        {entries.length === 0 ? (
          <div className="text-muted flex h-full items-center justify-center">
            Введите команду ниже
          </div>
        ) : (
          <div className="p-3">
            {entries.map((entry, i) => (
              <div key={i} className="mb-3">
                <div className="text-blue-400">
                  {PROMPT}{entry.input}
                </div>
                {"error" in entry.output ? (
                  <div className="text-red-400 ml-4 mt-1 whitespace-pre-wrap">
                    {entry.output.error}
                  </div>
                ) : (
                  <>
                    {entry.output.stdout && (
                      <div className="text-text ml-4 mt-1 whitespace-pre-wrap">
                        {entry.output.stdout}
                      </div>
                    )}
                    {entry.output.stderr && (
                      <div className="text-yellow-400 ml-4 mt-1 whitespace-pre-wrap">
                        {entry.output.stderr}
                      </div>
                    )}
                    <div className={entry.output.exitCode === 0 ? "text-green-400 ml-4 mt-1" : "text-red-400 ml-4 mt-1"}>
                      Exit code: {entry.output.exitCode}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-highlight-high bg-card mt-3 flex items-center gap-2 rounded-lg border px-3 py-2">
        <span className="text-blue-400 shrink-0">{PROMPT}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={running}
          placeholder={running ? "Выполняется..." : "Введите команду..."}
          className="bg-card text-text placeholder:text-muted flex-1 outline-none"
          autoFocus
          spellCheck={false}
        />
        {running && (
          <span className="text-muted animate-pulse text-xs">
            Выполняется...
          </span>
        )}
      </div>
    </div>
  );
}
