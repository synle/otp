import { Box } from "@mui/material";
import TileList from "~/components/TileList";
import { useMeProfile } from "~/utils/frontend/hooks/Auth";

export default function () {
  const { data: profile, isLoading } = useMeProfile();

  if (isLoading) {
    return <h2>Loading...</h2>;
  }

  if (!profile) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
      <TileList />
    </Box>
  );
}
