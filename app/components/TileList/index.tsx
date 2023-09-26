import { useState, useRef, useMemo } from "react";
import { useOtpIdentityList } from "~/utils/frontend/Hooks";
import {
  Box,
  TextField,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TileItem from "~/components/TileItem";

export default function () {
  const { data, isLoading } = useOtpIdentityList();
  const [q, setQ] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);

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
    if (!q) {
      return <>No data</>;
    }
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
                {items?.map((item) => {
                  return <option value={item.name} />;
                })}
              </datalist>
            </InputAdornment>
          ),
        }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={showQrCode}
            onChange={() => setShowQrCode(!showQrCode)}
            color="primary"
          />
        }
        label="Show / Hide QR Code"
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
          {items?.map((item) => {
            return (
              <TileItem
                key={item.id}
                item={item}
                showQrCode={showQrCode}
              ></TileItem>
            );
          })}
        </Box>
      </Box>
    </>
  );
}
