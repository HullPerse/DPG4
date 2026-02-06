import z from "zod";

export const userSchema = z.object({
  username: z
    .string()
    .min(4, "Имя должно содержать минимум 4 символа")
    .regex(/^[a-zA-Z0-9_-]+$/, "Только буквы, цифры, дефис и подчеркивание")
    .toUpperCase()
    .trim(),
  password: z
    .string()
    .min(4, "Пароль должен содержать минимум 8 символов")
    .trim(),
  avatar: z.string().min(1, "Выберите аватар"),
  color: z.string().min(1, "Выберите цвет"),
});
