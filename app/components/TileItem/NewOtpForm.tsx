import { useState } from "react";
import { useOtpIdentityById } from "~/utils/frontend/hooks/OtpIdentity";
import { Box, Typography, Button, TextField } from "@mui/material";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";
import { OtpIdentity } from "~/utils/backend/OtpIdentityDAO";
import { useCreateOtpIdentity } from "~/utils/frontend/hooks/OtpIdentity";

import OtpCodeLabel from "~/components/TileItem/OtpCodeLabel";

export default function () {
  const { dismiss } = useActionDialogs();
  const [name, setName] = useState("");
  const [totp, setTotp] = useState("");
  const { mutateAsync: createOtp, isLoading: isSaving } =
    useCreateOtpIdentity();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await createOtp({
            name,
            login: {
              totp,
            },
          });
          dismiss();
        } catch (err) {}
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          label="Name"
          autoFocus
          required
        />
        <TextField
          value={totp}
          onChange={(e) => setTotp(e.target.value)}
          label="TOTP"
          required
        />
        <Box sx={{ display: "flex", gap: 2, justifyContent: "end" }}>
          <Button type="submit" variant="contained" disabled={isSaving}>
            Save
          </Button>
          <Button onClick={() => dismiss()} disabled={isSaving}>
            Cancel
          </Button>
        </Box>
      </Box>
    </form>
  );
}
