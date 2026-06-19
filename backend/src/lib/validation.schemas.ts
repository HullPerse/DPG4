import { t } from "elysia"

export const idParam = t.Object({ id: t.String() })
export const userIdParam = t.Object({ userId: t.String() })
export const paginationQuery = t.Object({
  _page: t.Optional(t.String()),
  _perPage: t.Optional(t.String()),
  _sort: t.Optional(t.String()),
  _order: t.Optional(t.String()),
  q: t.Optional(t.String()),
})
export const searchQuery = t.Object({ q: t.Optional(t.String()) })
export const fileField = t.Optional(t.Union([t.Null(), t.Any()]))
