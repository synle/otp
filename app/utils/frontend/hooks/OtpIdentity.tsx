import { useMutation, useQuery, useQueryClient } from "react-query";
import axios from "axios";
import type { SessionData } from "~/utils/backend/Session";
import { OtpIdentityResponse } from "~/utils/backend/OtpIdentityDAO";

export function useMeProfile() {
  return useQuery(
    ["profile", "me"],
    () => axios.get<SessionData>(`/api/auth/me`).then((r) => r.data),
    {
      retry: false,
    }
  );
}

export function useOtpIdentityList() {
  return useQuery(
    ["otp_list"],
    () => axios.get<OtpIdentityResponse>(`/api/otp`).then((r) => r.data),
    {
      retry: false,
      refetchInterval: 20000,
    }
  );
}

export function useOtpIdentityById(id: string) {
  return useQuery(
    ["otp_item", id],
    () => axios.get<string>(`/api/otp/${id}`).then((r) => r.data),
    {
      retry: false,
      refetchInterval: 5000,
    }
  );
}

export function useUpdateOtpIdentity(id: string) {
  const queryClient = useQueryClient();

  return useMutation(
    (body: { name: string }) =>
      axios.put(`/api/otp/${id}`, body).then((r) => r.data as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("otp_list");
      },
    }
  );
}

export function useDeleteOtpIdentity(id: string) {
  const queryClient = useQueryClient();

  return useMutation(
    () => axios.delete(`/api/otp/${id}`).then((r) => r.data as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("otp_list");
      },
    }
  );
}
