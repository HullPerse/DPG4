import { WS_URL } from "@/api/client.api";

type WsMessage = {
  channel: string;
  action: string;
  id?: string;
  channels?: string[];
};

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
      dispatch(JSON.parse(String(event.data)) as WsMessage);
    } catch {
      /* ignore */
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
