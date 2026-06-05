import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { apiFetch } from "@/api/client.api";

interface MutationApiOptions {
  method?: string;
  auth?: boolean;
  timeoutMs?: number;
}

export function useAppMutation<TData, TVariables = void>(
  path: string,
  options: MutationApiOptions = {},
  queryOptions?: Omit<
    UseMutationOptions<TData, Error, TVariables>,
    "mutationFn"
  >,
): UseMutationResult<TData, Error, TVariables> {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      return apiFetch<TData>(path, {
        method: options.method ?? "POST",
        body: variables as Record<string, unknown>,
        auth: options.auth ?? true,
        timeoutMs: options.timeoutMs,
      });
    },
    ...queryOptions,
  });
}
