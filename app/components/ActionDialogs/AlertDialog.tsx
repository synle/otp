import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { Box } from "@mui/material";

/**
 * Caller-supplied options for an alert / confirm dialog.
 *
 * When `isConfirm` is true the dialog renders a Yes/No pair; otherwise a
 * single OK button is shown.
 */
export type AlertInput = {
  title?: string;
  message: string | JSX.Element;
  yesLabel?: string;
  onYesClick?: () => void;
  noLabel?: string;
  isConfirm?: boolean;
};

type AlertDialogProps = AlertInput & {
  open: boolean;
  onDismiss: () => void;
};

/**
 * Presentational MUI `<Dialog>` for alerts and confirmations.
 * Logic-free - state and submit/dismiss callbacks are provided by the
 * `useActionDialogs` hook.
 */
export default function AlertDialog(
  props: AlertDialogProps
): JSX.Element | null {
  return (
    <Dialog
      open={props.open}
      onClose={props.onDismiss}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <div style={{ maxWidth: 400 }}>
        <DialogTitle id="alert-dialog-title">
          {props.title || "Alert"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }} id="alert-dialog-description">
            {props.message}
          </Box>
        </DialogContent>
        <DialogActions sx={{ display: "flex", gap: 2, justifyContent: "end" }}>
          {props.isConfirm ? (
            <>
              <Button onClick={props.onYesClick} autoFocus variant="contained">
                {props.yesLabel || "Yes"}
              </Button>{" "}
              <Button onClick={props.onDismiss}>{props.noLabel || "No"}</Button>
            </>
          ) : (
            <>
              <Button onClick={props.onDismiss} autoFocus variant="contained">
                {props.yesLabel || "OK"}
              </Button>
            </>
          )}
        </DialogActions>
      </div>
    </Dialog>
  );
}
