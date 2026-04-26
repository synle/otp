import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { Box } from "@mui/material";

/**
 * Caller-supplied options for a generic modal.
 */
export type ModalInput = {
  /** Title shown in the dialog header. */
  title: string;
  /** Modal body. Any React node; the caller owns the layout inside it. */
  message: JSX.Element;
  /** Show the X icon button in the header. */
  showCloseButton?: boolean;
  /** When true, clicking the backdrop does *not* close the modal. */
  disableBackdropClick?: boolean;
  /** Maps to MUI Dialog `maxWidth`. */
  size: "xs" | "sm" | "md" | "lg";
};

type ModalProps = ModalInput & {
  open: boolean;
  onDismiss: () => void;
};

/**
 * Generic modal shell used by `useActionDialogs().modal(...)` to host
 * arbitrary React subtrees (forms, scanners, etc.).
 */
export default function Modal(props: ModalProps): JSX.Element | null {
  const onBackdropClick = () => {
    if (props.disableBackdropClick !== true) {
      props.onDismiss();
    }
  };
  return (
    <Dialog
      open={props.open}
      onClose={onBackdropClick}
      aria-labelledby="modal-dialog-title"
      aria-describedby="modal-dialog-description"
      fullWidth={true}
      maxWidth={props.size}
    >
      <DialogTitle id="modal-dialog-title">
        {props.title}
        {props.showCloseButton && (
          <IconButton
            aria-label="close"
            onClick={() => props.onDismiss()}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>{props.message}</Box>
      </DialogContent>
    </Dialog>
  );
}
