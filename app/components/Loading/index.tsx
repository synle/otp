import { Alert, Box, CircularProgress, Typography } from "@mui/material";

/**
 * Props for the `<Loading>` indicator.
 */
type LoadingProps = {
  /** Custom message; defaults to "Loading..." when omitted. */
  children?: JSX.Element | string;
  /** Layout: `alert` renders an MUI `<Alert>`; `box` an inline flex row. */
  containerType?: "alert" | "box";
};

/**
 * Generic loading indicator used while the user profile and identity list
 * are being fetched.
 */
export default function (props: LoadingProps) {
  const { children } = props;
  const containerType = props.containerType || "alert";

  const contentDom = <Typography>{children || "Loading..."}</Typography>;
  switch (containerType) {
    case "box":
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={20} sx={{ alignSelf: "center" }} />
          {contentDom}
        </Box>
      );

    case "alert":
    default:
      return (
        <Alert
          severity="info"
          iconMapping={{
            info: <CircularProgress size={20} sx={{ alignSelf: "center" }} />,
          }}
        >
          {contentDom}
        </Alert>
      );
  }
}
