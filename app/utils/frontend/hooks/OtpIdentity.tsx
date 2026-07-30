import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  createOtpIdentity,
  OtpIdentityResponse,
  updateOtpIdentity,
} from "~/utils/backend/OtpIdentityDAO";

/**
 * Subscribe to the authenticated user's identity list.
 *
 * - Refetches every 20s so codes shown in the list stay fresh-ish without
 *   forcing the user to refresh the page.
 * - `retry: false` so a 401 fails fast and the root layout can redirect.
 */
export function useOtpIdentityList() {
  return useQuery(
    ["otp_list"],
    () => axios.get<OtpIdentityResponse>(`/api/otp`).then((r) => r.data),
    {
      retry: false,
      refetchInterval: 20000,
    },
  );
}

/**
 * Generate the live 6-digit code for a given `otpauth://` URI.
 *
 * Polls every 5s so the displayed code rolls over with the 30s TOTP window.
 * The `tolp` typo is intentional and matches the server route in
 * `api.otp_code.ts`; both sides must change together if renamed.
 *
 * @param tolp - The `otpauth://totp/...` URI. When empty the query is disabled.
 */
export function useOtpCode(tolp: string) {
  return useQuery(
    ["otp_code", tolp],
    () => axios.post<string>(`/api/otp_code`, { tolp }).then((r) => r.data),
    {
      retry: false,
      refetchInterval: 5000,
      enabled: !!tolp,
    },
  );
}

/**
 * Mutation that creates a new identity (POST `/api/otp/new`) and invalidates
 * the cached list on success so the new entry shows up immediately.
 */
export function useCreateOtpIdentity() {
  const queryClient = useQueryClient();

  return useMutation(
    (body: Parameters<typeof createOtpIdentity>[1]) =>
      axios.post(`/api/otp/new`, body).then((r) => r.data as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("otp_list");
      },
    },
  );
}

/**
 * Mutation that updates the identity with the given `id` (PUT `/api/otp/:id`).
 *
 * @param id - Id of the identity being edited.
 */
export function useUpdateOtpIdentity(id: string) {
  const queryClient = useQueryClient();

  return useMutation(
    (body: Parameters<typeof updateOtpIdentity>[2]) =>
      axios.put(`/api/otp/${id}`, body).then((r) => r.data as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("otp_list");
      },
    },
  );
}

/**
 * Mutation that deletes the identity with the given `id` (DELETE `/api/otp/:id`).
 *
 * @param id - Id of the identity being removed.
 */
export function useDeleteOtpIdentity(id: string) {
  const queryClient = useQueryClient();

  return useMutation(
    () => axios.delete(`/api/otp/${id}`).then((r) => r.data as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("otp_list");
      },
    },
  );
}
