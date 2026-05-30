type WsClient = { send: (data: string) => void };

const clients = new Set<WsClient>();

export function registerClient(ws: WsClient) {
  clients.add(ws);
}

export function unregisterClient(ws: WsClient) {
  clients.delete(ws);
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

export function broadcastAll(action: string, id?: string) {
  for (const name of [
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
  ]) {
    broadcast(name, action, id);
  }
}
