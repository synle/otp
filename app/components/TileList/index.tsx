import { useState, useRef, useEffect, useMemo } from "react";
import { useOtpIdentityList, useOtpIdentityById } from "~/utils/frontend/Hooks";
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Link,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { toast } from "react-toastify";
import * as qrcode from "qrcode";

function TileItem(props: any) {
  const { item } = props;
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
    <Paper sx={{ py: 1, px: 2 }} elevation={3}>
      <Typography
        sx={{
          color: "text.disabled",
          fontWeight: "bold",
          textTransform: "uppercase",
        }}
      >
        {item.name}
      </Typography>
      <img src={qrCode} />
      <Typography variant="h3">
        <Link
          onClick={isLoading ? () => {} : () => copyTextToClipboard(data)}
          underline="hover"
          sx={{ cursor: "pointer" }}
        >
          {data || "......"}
        </Link>
      </Typography>
    </Paper>
  );
}

export default function () {
  const { data, isLoading } = useOtpIdentityList();
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    if (q) {
      return data?.items.filter((item) =>
        item.name.toLowerCase()?.includes(q.toLowerCase())
      );
    }
    return data?.items;
  }, [q, data]);

  //@ts-ignore
  const timer = useRef<ReturnType<typeof setTimeout>>(0);

  if (isLoading) {
    return <>Loading</>;
  } else if (!data) {
    return <>No response from server</>;
  }

  if (!items || items.length === 0) {
    return <>No data</>;
  }

  return (
    <>
      <TextField
        id="otp-item-search-filter"
        name="otp-item-search-filter"
        defaultValue={q || ""}
        onChange={(e) => {
          clearTimeout(timer.current);

          timer.current = setTimeout(async () => {
            setQ((e.target.value || "").trim());
          }, 500);
        }}
        placeholder="Search for item"
        inputProps={{
          sx: {
            fontSize: "caption.fontSize",
          },
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
              <datalist id="otpItemNames">
                {items.map((item) => {
                  return <option value={item.name} />;
                })}
              </datalist>
            </InputAdornment>
          ),
        }}
      />
      <Box
        sx={{
          ".TileList": {
            display: "grid",
            rowGap: 2,
            columnGap: 3,
            gridTemplateColumns: "repeat(4, 1fr)",
          },

          "@media (max-width:1200px)": {
            ".TileList": {
              gridTemplateColumns: "repeat(3, 1fr)",
            },
          },

          "@media (max-width:960px)": {
            ".TileList": {
              gridTemplateColumns: "repeat(2, 1fr)",
            },
          },

          "@media (max-width:600px)": {
            ".TileList": {
              gridTemplateColumns: "repeat(1, 1fr)",
            },
          },
        }}
      >
        <Box className="TileList">
          {items.map((item) => {
            return <TileItem key={item.id} item={item}></TileItem>;
          })}
        </Box>
      </Box>
    </>
  );
}
