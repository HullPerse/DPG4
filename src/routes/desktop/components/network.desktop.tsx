import { NETWORK } from "@/config/apps.config";
import { useNetworkState } from "@uidotdev/usehooks";
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkHover() {
  const network = useNetworkState();

  const getSignalBars = (type: string) => {
    switch (type) {
      case "4g":
        return 4;
      case "3g":
        return 3;
      case "2g":
        return 2;
      case "slow-2g":
        return 1;
      default:
        return 0;
    }
  };

  const getQuality = (effectiveType: string) => {
    if (!network.online) return "text-red-500";
    if (!effectiveType) return "text-muted";

    switch (effectiveType) {
      case "4g":
        return "text-green-500";
      case "3g":
        return "text-yellow-500";
      case "2g":
        return "text-yellow-800";
      case "slow-2g":
        return "text-red-500";
      default:
        return "text-muted";
    }
  };

  const getValue = (id: string) => {
    if (!id) return "N/A";

    switch (id) {
      case "quality":
        return !network.online
          ? "ОФФЛАЙН"
          : network.effectiveType?.toUpperCase();
      case "downlink":
        return `${network.downlink} Mbps`.toUpperCase();
      case "latency":
        return `${network.rtt} ms`.toUpperCase();
      default:
        return "N/A";
    }
  };

  return (
    <main className="flex w-full flex-col gap-2">
      {/* TOP BAR */}
      <section className="flex w-full flex-row items-center justify-between gap-2">
        <div className="flex flex-row gap-2">
          <div
            className={`flex size-8 items-center justify-center rounded-lg ${
              network.online
                ? "bg-primary/15 text-primary"
                : "bg-red-500/20 text-red-500/70"
            }`}
          >
            {network.online ? (
              <Wifi className="size-4" />
            ) : (
              <WifiOff className="size-4" />
            )}
          </div>
          <div>
            <p className="text-foreground text-sm leading-none font-semibold">
              {network.online ? "Подключено" : "Нет подключения"}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">Сеть</p>
          </div>
        </div>
        <div className="flex items-end gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-full transition-colors ${
                bar <= getSignalBars(network.effectiveType ?? "4g")
                  ? "bg-primary"
                  : "bg-muted"
              }`}
              style={{ height: `${bar * 4 + 4}px` }}
            />
          ))}
        </div>
      </section>
      <div className="w-full border border-highlight-high" />
      <section className="flex flex-col gap-2">
        {/* ROW INFO */}
        {NETWORK.map((data) => (
          <div
            key={data.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-text">
              {data.icon}
              <span className="text-xs">{data.label}</span>
            </div>
            <span
              className={`flex flex-row text-xs font-medium ${data.id === "quality" && !network.online ? "text-red-700" : "text-text"} ${data.id === "quality" && getQuality(network.effectiveType ?? "4g")}`}
            >
              {getValue(data.id)}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
