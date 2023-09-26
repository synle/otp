import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import {
  Box,
  Button,
  CssBaseline,
  Paper,
  Typography,
  Link,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "react-query";
import { useMeProfile } from "~/utils/frontend/hooks/OtpIdentity";
import Loading from "~/components/Loading";
import { useState } from "react";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import ActionDialogsContext from "~/utils/frontend/hooks/ActionDialogs";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

const theme = createTheme({});
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // notifyOnChangeProps: 'tracked',
      refetchOnWindowFocus: false,
      retry: (failureCount, error?: any) => {
        // don't retry on these errors
        switch (error?.status) {
          case 400: // bad request
          case 401: // unauthorized - not authenticated
          case 403: // forbidden - not allowed
          case 404: // not found
            return false;
        }

        return true;
      },
    },
  },
});

function AppContextReducer(props: { children: JSX.Element | JSX.Element[] }) {
  const contexts = [ActionDialogsContext];

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <ToastContainer />
        <CssBaseline />
        {contexts.reduceRight(
          (acc, ContextProvider) => (
            <ContextProvider>{acc}</ContextProvider>
          ),
          <>{props.children}</>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function App() {
  const { data: meProfile, isLoading } = useMeProfile();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  let contentDom = <></>;

  if (isLoading) {
    contentDom = <Loading>Loading...</Loading>;
  } else if (!meProfile) {
    contentDom = (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Paper
          sx={{
            px: 4,
            py: 3,
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: 4 }}>
            Welcome back.
          </Typography>
          <Typography sx={{ marginBottom: 4 }}>
            You are not authenticated, please log in to continue.
          </Typography>
          <Box>
            <Button variant="contained" component={Link} href="/api/auth/login">
              Log in
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  } else {
    const linkStyles = {
      color: "background.default",
      fontWeight: "bold",
    };

    contentDom = (
      <>
        <AppBar position="static">
          <Toolbar sx={{ display: "flex", gap: 2 }}>
            <Link href="/" sx={{ marginRight: "auto" }} underline="hover">
              <Typography variant="h5" sx={linkStyles}>
                OTP
              </Typography>
            </Link>
            <Box>
              <IconButton
                aria-label="profile"
                aria-controls="current-user-profile-menu"
                aria-haspopup="true"
                onClick={(event) => setAnchorEl(event.currentTarget)}
              >
                <Avatar>{meProfile.initials}</Avatar>
              </IconButton>
              <Menu
                id="current-user-profile-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem>{meProfile.fullName}</MenuItem>
                <Divider sx={{ my: 1 }} />
                <MenuItem component={Link} href="/api/auth/logout">
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ py: 2, px: 3 }}>
          <Outlet />
        </Box>
      </>
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      {contentDom}
    </Box>
  );
}

export default function () {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <CssBaseline />
        <AppContextReducer>
          <App />
        </AppContextReducer>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
