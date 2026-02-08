import { Cell } from "@/types/cell";

export default function GameArea({ data }: { data: Cell[] }) {
  return (
    <main className="h-full p-2 b grid grid-cols-5 gap-2">
      {data.map((cell, index) => (
        <div key={index} className="w-20 h-20 bg-card border-2 rounded">
          1
        </div>
      ))}
    </main>
  );
}
