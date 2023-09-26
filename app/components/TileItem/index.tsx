import { useState, useEffect } from "react";
import { useOtpIdentityById } from "~/utils/frontend/hooks/OtpIdentity";
import { Box, Paper, Typography, Link, Button, TextField } from "@mui/material";
import { toast } from "react-toastify";
import * as qrcode from "qrcode";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";
import { OtpIdentity } from "~/utils/backend/OtpIdentityDAO";
import { useUpdateOtpIdentity } from "~/utils/frontend/hooks/OtpIdentity";

type TileItemProps = {
  showQrCode: boolean;
  item: OtpIdentity;
};

const onCopyToClipboard = (text?: string) => {
  if (!text) {
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);

  toast.dismiss();
  toast.success(`Code ${text} copied to clipboard`, {
    position: "top-right",
    autoClose: 3000, // Duration in milliseconds
  });
};

export function EditOtpForm(props: { item: OtpIdentity; qrCode: string }) {
  const { item, qrCode } = props;
  const { dismiss } = useActionDialogs();
  const [name, setName] = useState(item.name);
  const { mutateAsync, isLoading: isSaving } = useUpdateOtpIdentity(item.id);
  const { data, isLoading } = useOtpIdentityById(item.id);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await mutateAsync({ name });
          dismiss();
        } catch (err) {}
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}>
        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          label="Name"
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
          <Typography variant="h4">
            <Link
              component={Button}
              onClick={isLoading ? () => {} : () => onCopyToClipboard(data)}
              underline="none"
              sx={{ cursor: "pointer" }}
            >
              {data || "......"}
            </Link>
          </Typography>
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

export default function (props: TileItemProps) {
  const { item, showQrCode } = props;
  const { data, isLoading } = useOtpIdentityById(item.id);
  const [qrCode, setQrCode] = useState("");
  const { modal } = useActionDialogs();

  useEffect(() => {
    async function _load() {
      setQrCode(await qrcode.toDataURL(item.login.totp));
    }
    _load();
  }, [item.login.totp]);

  const onEdit = () => {
    modal({
      showCloseButton: true,
      size: "md",
      title: `Edit`,
      message: <EditOtpForm item={item} qrCode={qrCode} />,
    });
  };

  return (
    <Paper
      sx={{
        py: 1,
        px: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        alignItems: "center",
      }}
      elevation={3}
    >
      <Link
        sx={{
          color: "text.disabled",
          fontWeight: "bold",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
        underline="none"
        onClick={onEdit}
      >
        {item.name}
      </Link>
      {showQrCode ? (
        <img src={qrCode} style={{ marginLeft: "-1rem" }} />
      ) : (
        <Typography variant="h4">
          <Link
            component={Button}
            onClick={isLoading ? () => {} : () => onCopyToClipboard(data)}
            underline="none"
            sx={{ cursor: "pointer" }}
          >
            {data || "......"}
          </Link>
        </Typography>
      )}
    </Paper>
  );
}
