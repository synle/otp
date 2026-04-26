import { Box } from "@mui/material";
import TileList from "~/components/TileList";
import { useMeProfile } from "~/utils/frontend/hooks/Auth";

/**
 * Index route (`/`).
 *
 * Gates rendering on the authenticated profile so the tile grid is never
 * shown before we know whether the user is signed in. When unauthenticated,
 * the surrounding `root.tsx` layout takes over and shows the login screen.
 */
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
