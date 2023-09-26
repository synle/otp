import { useState, useRef, useMemo } from "react";
import { useOtpIdentityList } from "~/utils/frontend/hooks/OtpIdentity";
import {
  Box,
  TextField,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TileItem from "~/components/TileItem";
import Loading from "~/components/Loading";

export default function () {
  const { data, isLoading } = useOtpIdentityList();
  const [q, setQ] = useState("");
  const [sortingOption, setSortingOption] = useState("oldest-first");
  const [showQrCode, setShowQrCode] = useState(false);

  const items = useMemo(() => {
    let itemsToReturn = data?.items;

    if (q) {
      itemsToReturn = data?.items.filter((item) =>
        item.name.toLowerCase()?.includes(q.toLowerCase())
      );
    }

    itemsToReturn = [...(itemsToReturn || [])];

    switch (sortingOption) {
      case "name-desc":
        return itemsToReturn.sort((a, b) => {
          const na = a.name;
          const nb = b.name;
          return nb.localeCompare(na);
        });
      case "name-asc":
        return itemsToReturn.sort((a, b) => {
          const na = a.name;
          const nb = b.name;
          return na.localeCompare(nb);
        });
      case "recent-first":
        return itemsToReturn.reverse();
      case "oldest-first":
        return itemsToReturn;
    }
  }, [q, data, sortingOption]);

  //@ts-ignore
  const timer = useRef<ReturnType<typeof setTimeout>>(0);

  if (isLoading) {
    return <Loading />;
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
                  return <option key={item.name} value={item.name} />;
                })}
              </datalist>
            </InputAdornment>
          ),
        }}
      />
      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
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
        <FormControl variant="outlined" sx={{ minWidth: "200px" }}>
          <InputLabel id="sorting-label">Sort By</InputLabel>
          <Select
            labelId="sorting-label"
            id="sorting-select"
            value={sortingOption}
            onChange={(e) => setSortingOption(e.target.value)}
            label="Sort By"
          >
            <MenuItem value="name-asc">By name ascending</MenuItem>
            <MenuItem value="name-desc">By name descending</MenuItem>
            <MenuItem value="recent-first">By most recent first</MenuItem>
            <MenuItem value="oldest-first">By least recent first</MenuItem>
          </Select>
        </FormControl>
      </Box>
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
