import { Typography, Link, Button, Skeleton } from "@mui/material";
import { toast } from "react-toastify";

export default function (props: { data?: string; isLoading?: boolean }) {
  const { data, isLoading } = props;

  const onCopyToClipboard = (text?: string) => {
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
  };

  return (
    <Typography
      variant="h4"
      sx={{
        fontFamily: "monospace",
      }}
    >
      <Link
        component={Button}
        onClick={() => {
          if (!isLoading) {
            onCopyToClipboard(data);
          }
        }}
        underline="none"
        sx={{ cursor: "pointer" }}
      >
        {isLoading ? (
          <Skeleton animation="wave" height={42} width={120} />
        ) : (
          data
        )}
      </Link>
    </Typography>
  );
}
