import { Alert, Box, CircularProgress, Typography } from "@mui/material";

type LoadingProps = {
  children?: JSX.Element | string;
  containerType?: "alert" | "box";
};

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
