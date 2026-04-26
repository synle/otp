import { Typography, Link, Button, Skeleton } from "@mui/material";
import { toast } from "react-toastify";

/**
 * Big monospace label that shows the current TOTP code (or a loading
 * skeleton). Clicking it copies the code to the clipboard via the legacy
 * `execCommand` API (chosen for broad compatibility, including over plain HTTP).
 */
export default function (props: { data?: string; isLoading?: boolean }) {
  const { data, isLoading } = props;

  /**
   * Copy `text` to the clipboard using a hidden textarea + `execCommand`.
   * Toasts on success. No-op when `text` is falsy.
   */
  const onCopyToClipboard = (text?: string) => {
    if (!text) {
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    textArea.focus();
    document.execCommand("copy");
    textArea.remove();

    toast.dismiss();
    toast.success(`Code ${text} copied to clipboard`, {
      position: "top-right",
      autoClose: 3000, // Duration in milliseconds
    });
  };

  let contentDom = <></>;
  if (isLoading) {
    contentDom = <Skeleton animation="wave" height={42} width={120} />;
  } else if (data) {
    contentDom = (
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
        {data}
      </Link>
    );
  } else {
    contentDom = <>Invalid</>;
  }

  return (
    <Typography
      variant="h4"
      sx={{
        fontFamily: "monospace",
      }}
    >
      {contentDom}
    </Typography>
  );
}
