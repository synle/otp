import { useState, useEffect } from "react";
import { useOtpCode } from "~/utils/frontend/hooks/OtpIdentity";
import { Box, Paper, Link, IconButton } from "@mui/material";
import * as qrcode from "qrcode";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";
import { OtpIdentity } from "~/utils/backend/OtpIdentityDAO";
import { useDeleteOtpIdentity } from "~/utils/frontend/hooks/OtpIdentity";
import DeleteIcon from "@mui/icons-material/Delete";

import OtpCodeLabel from "~/components/TileItem/OtpCodeLabel";
import EditOtpForm from "~/components/TileItem/EditOtpForm";
import BrandIcon from "~/components/TileItem/BrandIcon";

export type TileItemProps = {
  showQrCode: boolean;
  item: OtpIdentity;
};

export default function (props: TileItemProps) {
  const { item, showQrCode } = props;
  const { data, isLoading } = useOtpCode(item.login.totp);
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
      title: `Edit OTP`,
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
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <BrandIcon icon={item.name} />
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
      </Box>
      {showQrCode ? (
        <img src={qrCode} style={{ marginLeft: "-1rem" }} />
      ) : (
        <Box sx={{ display: "flex", gap: 3 }}>
          <OtpCodeLabel data={data} isLoading={isLoading} />
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
