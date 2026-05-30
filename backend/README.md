# DPG API (Elysia + Bun + SQLite)

## Запуск

```bash
bun install
mkdir -p data
bun run db:migrate
bun run dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- WebSocket: `ws://localhost:3000/ws`

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `3000` | Порт сервера |
| `JWT_SECRET` | (dev secret) | Секрет JWT |
| `DB_PATH` | `data/db.sqlite` | Путь к SQLite |
| `CORS_ORIGIN` | `true` | CORS |
| `STEAM_API_KEY` | — | Steam Web API (прокси `/steam/*`) |

## Резервная копия БД

```bash
bun run backup
```

Копия сохраняется в `backups/db-<timestamp>.sqlite`.

## Импорт из PocketBase

Скопируйте `data.db` с сервера PocketBase и укажите путь:

```bash
PB_DB_PATH="D:/path/to/pb_data/data.db" bun run import:pb
```

Файлы подтягиваются из `old backend/pb_data/storage` (если бинарники есть в репозитории).

## Realtime

Клиенты подключаются к `/ws`. При изменении данных сервер шлёт:

```json
{ "channel": "games", "action": "update", "id": "..." }
```

Встроенный WebSocket Elysia.
