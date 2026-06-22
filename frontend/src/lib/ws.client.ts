import { WS_URL } from "@/api/client.api";
import { z } from "zod";

const wsMessageSchema = z.object({
  channel: z.string().min(1),
  action: z.string().min(1),
  id: z.string().optional(),
  channels: z.array(z.string()).optional(),
});

type WsMessage = z.infer<typeof wsMessageSchema>;

type Listener = (data: WsMessage) => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const channelListeners = new Map<string, Set<Listener>>();

function dispatch(data: WsMessage) {
  const set = channelListeners.get(data.channel);
  if (set) for (const listener of set) listener(data);
}

function connect() {
  if (socket && socket.readyState <= WebSocket.OPEN) return;

  socket = new WebSocket(WS_URL);

  socket.onmessage = (event) => {
    try {
      const raw = JSON.parse(String(event.data));
      const parsed = wsMessageSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("Invalid WS message:", parsed.error.issues);
        return;
      }
      dispatch(parsed.data);
    } catch {
      console.warn("Failed to parse WS message");
    }
  };

  socket.onclose = () => {
    socket = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2000);
  };
}

export function ensureWsConnected() {
  connect();
}

export function subscribeWsChannel(
  channel: string,
  listener: Listener,
): () => void {
  ensureWsConnected();
  let set = channelListeners.get(channel);
  if (!set) {
    set = new Set();
    channelListeners.set(channel, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) channelListeners.delete(channel);
  };
}

export function closeWs() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  socket?.close();
  socket = null;
}
