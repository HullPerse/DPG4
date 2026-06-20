import type { WsClient } from "@/types/websocket";

const clients = new Set<WsClient>();

export const registerClient = (ws: WsClient) => clients.add(ws);
export const unregisterClient = (ws: WsClient) => clients.delete(ws);
export const getClientCount = (): number => clients.size;

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
  "users",
  "games",
  "presets",
  "items",
  "inventory",
  "market",
  "activity",
  "chats",
  "rules",
  "ads",
  "drawings",
  "cells",
  "quests",
] as const;

export function broadcastAll(action: string, id?: string) {
  const payload = JSON.stringify({ channels: ALL_CHANNELS, action, id });
  const singlePayload = JSON.stringify({
    channel: ALL_CHANNELS[0],
    action,
    id,
  });
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
