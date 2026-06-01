type WsClient = { send: (data: string) => void };

const clients = new Set<WsClient>();

export function registerClient(ws: WsClient) {
  clients.add(ws);
}

export function unregisterClient(ws: WsClient) {
  clients.delete(ws);
}

export function getClientCount(): number {
  return clients.size;
}

export function broadcast(channel: string, action: string, id?: string) {
  const payload = JSON.stringify({ channel, action, id });
  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      clients.delete(client);
    }
  }
}

const ALL_CHANNELS = [
  "users", "games", "presets", "items", "inventory", "market",
  "activity", "chats", "rules", "ads", "drawings", "cells",
] as const;

export function broadcastAll(action: string, id?: string) {
  const payload = JSON.stringify({ channels: ALL_CHANNELS, action, id });
  const singlePayload = JSON.stringify({ channel: ALL_CHANNELS[0], action, id });
  for (const client of clients) {
    try {
      client.send(ALL_CHANNELS.length > 1 ? payload : singlePayload);
    } catch {
      clients.delete(client);
    }
  }
}

export function broadcastAdminReload() {
  broadcast("admin", "reload");
  broadcastAll("update");
}
