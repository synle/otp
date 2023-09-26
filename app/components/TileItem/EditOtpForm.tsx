import { useState } from "react";
import { useOtpIdentityById } from "~/utils/frontend/hooks/OtpIdentity";
import { Box, Typography, Button, TextField } from "@mui/material";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";
import { OtpIdentity } from "~/utils/backend/OtpIdentityDAO";
import { useUpdateOtpIdentity } from "~/utils/frontend/hooks/OtpIdentity";

import OtpCodeLabel from "~/components/TileItem/OtpCodeLabel";

export default function (props: { item: OtpIdentity; qrCode: string }) {
  const { item, qrCode } = props;
  const { dismiss } = useActionDialogs();
  const [name, setName] = useState(item.name);
  const { mutateAsync: updateOtp, isLoading: isSaving } = useUpdateOtpIdentity(
    item.id
  );
  const { data, isLoading } = useOtpIdentityById(item.id);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await updateOtp({ name });
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
        <TextField defaultValue={item.login.totp} label="TOTP" disabled />
        <Box>
          <Typography sx={{ color: "text.disabled", fontWeight: "bold" }}>
            QR Code
          </Typography>
          <img src={qrCode} style={{ marginLeft: "-1rem", width: "150px" }} />
        </Box>
        <Box>
          <Typography sx={{ color: "text.disabled", fontWeight: "bold" }}>
            Code
          </Typography>
          <OtpCodeLabel data={data} isLoading={isLoading} />
        </Box>
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
