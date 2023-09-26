import { useState, useEffect } from "react";
import { useOtpIdentityById } from "~/utils/frontend/Hooks";
import {
  Paper,
  Typography,
  Link,
  Button,
} from "@mui/material";
import { toast } from "react-toastify";
import * as qrcode from "qrcode";

export default function (props: any) {
  const { item, showQrCode } = props;
  const { data, isLoading } = useOtpIdentityById(item.id);
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    async function _load() {
      setQrCode(await qrcode.toDataURL(item.login.totp));
    }
    _load();
  }, [item.login.totp]);

  function copyTextToClipboard(text?: string) {
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
  }

  return (
    <Paper sx={{ py: 1, px: 2, textAlign: "center" }} elevation={3}>
      <Typography
        sx={{
          color: "text.disabled",
          fontWeight: "bold",
          textTransform: "uppercase",
        }}
      >
        {item.name}
      </Typography>
      {showQrCode ? (
        <img src={qrCode} style={{ marginLeft: "-1rem" }} />
      ) : (
        <Typography variant="h3">
          <Link
            component={Button}
            onClick={isLoading ? () => { } : () => copyTextToClipboard(data)}
            underline="hover"
            sx={{ cursor: "pointer" }}
          >
            {data || "......"}
          </Link>
        </Typography>
      )}
    </Paper>
  );
}
