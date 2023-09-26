import { useMeProfile } from "~/utils/frontend/hooks/OtpIdentity";
import DataTable, { ColumnFilter } from "~/components/DataTable";
import TileList from "~/components/TileList";
import { Box, Typography } from "@mui/material";

export default function Index() {
  const { data: profile, isLoading } = useMeProfile();

  if (isLoading) {
    return <h2>Loading...</h2>;
  }

  if (!profile) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
      <Typography>Hello {profile.fullName}.</Typography>
      <TileList />
    </Box>
  );
}
