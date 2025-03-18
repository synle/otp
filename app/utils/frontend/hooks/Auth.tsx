import axios from "axios";
import { useQuery } from "react-query";
import type { User } from "~/types.d.ts";

export function useMeProfile() {
  return useQuery(
    ["profile", "me"],
    () => axios.get<User>(`/api/auth/me`).then((r) => r.data),
    {
      retry: false,
    }
  );
}
