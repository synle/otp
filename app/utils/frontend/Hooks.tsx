import { useMutation, useQuery, useQueryClient } from "react-query";
import axios from "axios";
import type { SessionData } from "~/utils/backend/Session";

export function useMeProfile() {
  return useQuery(
    ["profile", "me"],
    () => axios.get<SessionData>(`/api/auth/me`).then((r) => r.data),
    {
      retry: false,
    }
  );
}
