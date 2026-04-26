import axios from "axios";
import { useQuery } from "react-query";
import type { User } from "~/types.d.ts";

/**
 * Fetch the current user's Graph `/me` profile via `GET /api/auth/me`.
 *
 * The query is non-retrying so a 401 (unauthenticated) immediately yields
 * `data === undefined`, which the root component uses to render the login
 * prompt. Treat a falsy `data` as "not signed in".
 */
export function useMeProfile() {
  return useQuery(
    ["profile", "me"],
    () => axios.get<User>(`/api/auth/me`).then((r) => r.data),
    {
      retry: false,
    }
  );
}
