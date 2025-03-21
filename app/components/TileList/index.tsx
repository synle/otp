import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActionDialogs } from 'react-dialog-mui';
import Loading from "~/components/Loading";
import TileItem from "~/components/TileItem";
import BrandIcon from "~/components/TileItem/BrandIcon";
import NewOtpForm from "~/components/TileItem/NewOtpForm";
import { useOtpIdentityList } from "~/utils/frontend/hooks/OtpIdentity";

const DEFAULT_SORTING_OPTION = "name-asc";

export function NewOtpButton() {
  const { modal } = useActionDialogs();

  const onCreateNewOtp = () => {
    modal({
      showCloseButton: true,
      size: "md",
      title: `New OTP`,
      message: <NewOtpForm />,
    });
  };

  return (
    <Button onClick={onCreateNewOtp} variant="contained">
      New OTP
    </Button>
  );
}

export default function () {
  const navigate = useNavigate();

  const { data, isLoading } = useOtpIdentityList();
  const [q, setQ] = useState("");
  const [sortingOption, setSortingOption] = useState(DEFAULT_SORTING_OPTION);
  const [showQrCode, setShowQrCode] = useState(false);
  const { modal } = useActionDialogs();

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

  const sortedItemNames = useMemo(() => {
    return (items?.map((item) => item.name) || []).sort();
  }, [items]);

  // on first load, set it up
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setQ(searchParams.get("q") || "");
    setSortingOption(
      searchParams.get("sortingOption") || DEFAULT_SORTING_OPTION
    );
    setShowQrCode(searchParams.get("showQrCode") === "1" ? true : false);
  }, []);

  // persist the params into search query
  useEffect(() => {
    navigate(
      `/?q=${q}&sortingOption=${sortingOption}&showQrCode=${
        showQrCode ? "1" : "0"
      }`,
      { replace: true }
    );
  }, [q, sortingOption, showQrCode]);

  if (isLoading) {
    return <Loading />;
  } else if (!data) {
    return <>No response from server</>;
  }

  let contentDom = <></>;
  if (!items || items.length === 0) {
    if (!q) {
      contentDom = <Alert>No data.</Alert>;
    } else {
      contentDom = (
        <Alert>
          No data matching your search.{" "}
          <Link onClick={() => setQ("")}>
            <strong>Clear search</strong>
          </Link>
          .
        </Alert>
      );
    }
  } else {
    contentDom = (
      <>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
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
            label="QR Code"
            sx={{ flexShrink: 0 }}
          />
          <FormControl
            variant="outlined"
            sx={{ minWidth: "200px", flexShrink: 0 }}
          >
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

  return (
    <>
      <Autocomplete
        value={q || ""}
        onChange={(e, newValue) => {
          // when user select an option from dropdown
          clearTimeout(timer.current);
          setQ(newValue || "");
        }}
        onInputChange={(e, newValue, reason) => {
          // when user enter data from textbox
          if (reason === "reset") {
            return;
          }
          clearTimeout(timer.current);

          timer.current = setTimeout(async () => {
            setQ((newValue || "").trim());
          }, 500);
        }}
        options={sortedItemNames}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search"
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              autoComplete: "off",
              sx: {
                fontSize: "caption.fontSize",
              },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        )}
        renderOption={(props, matchedOptionLabel) => {
          return (
            <Box
              sx={{ display: "flex", gap: 1, alignItems: "center" }}
              {...props}
            >
              <BrandIcon icon={matchedOptionLabel} />
              <Box>{matchedOptionLabel}</Box>
            </Box>
          );
        }}
      />
      {contentDom}
    </>
  );
}
