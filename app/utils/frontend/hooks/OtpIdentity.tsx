import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  createOtpIdentity,
  OtpIdentityResponse,
  updateOtpIdentity,
} from "~/utils/backend/OtpIdentityDAO";

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

export function useOtpCode(tolp: string) {
  return useQuery(
    ["otp_code", tolp],
    () => axios.post<string>(`/api/otp_code`, { tolp }).then((r) => r.data),
    {
      retry: false,
      refetchInterval: 5000,
      enabled: !!tolp,
    }
  );
}

export function useCreateOtpIdentity() {
  const queryClient = useQueryClient();

  return useMutation(
    (body: Parameters<typeof createOtpIdentity>[1]) =>
      axios.post(`/api/otp/new`, body).then((r) => r.data as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("otp_list");
      },
    }
  );
}

export function useUpdateOtpIdentity(id: string) {
  const queryClient = useQueryClient();

  return useMutation(
    (body: Parameters<typeof updateOtpIdentity>[2]) =>
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
