import { useState, useEffect } from "react";
import { useOtpIdentityById } from "~/utils/frontend/hooks/OtpIdentity";
import {
  Box,
  Paper,
  Typography,
  Link,
  Button,
  TextField,
  IconButton,
  Skeleton,
} from "@mui/material";
import { toast } from "react-toastify";
import * as qrcode from "qrcode";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";
import { OtpIdentity } from "~/utils/backend/OtpIdentityDAO";
import {
  useUpdateOtpIdentity,
  useDeleteOtpIdentity,
} from "~/utils/frontend/hooks/OtpIdentity";
import DeleteIcon from "@mui/icons-material/Delete";

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

export function OtpCode(props: { data?: string; isLoading?: boolean }) {
  const { data, isLoading } = props;

  return (
    <Typography
      variant="h4"
      sx={{
        fontFamily: "monospace",
      }}
    >
      <Link
        component={Button}
        onClick={() => {
          if (!isLoading) {
            onCopyToClipboard(data);
          }
        }}
        underline="none"
        sx={{ cursor: "pointer" }}
      >
        {isLoading ? (
          <Skeleton animation="wave" height={42} width={120} />
        ) : (
          data
        )}
      </Link>
    </Typography>
  );
}

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
          <OtpCode data={data} isLoading={isLoading} />
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
  const { mutateAsync: deleteItem, isLoading: isDeleting } =
    useDeleteOtpIdentity(item.id);
  const [qrCode, setQrCode] = useState("");
  const { modal, confirm } = useActionDialogs();

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

  const onDelete = async () => {
    try {
      await confirm(`Do you want to delete this OTP item?`);
      await deleteItem();
    } finally {
    }
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
        <Box sx={{ display: "flex", gap: 3 }}>
          <OtpCode data={data} isLoading={isLoading} />
          <IconButton
            aria-label="Delete"
            disabled={isDeleting}
            onClick={onDelete}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )}
    </Paper>
  );
}
