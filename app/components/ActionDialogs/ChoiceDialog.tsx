import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

/**
 * One selectable row in a choice dialog.
 */
export type ChoiceOption = {
  /** Optional icon rendered before the label. */
  startIcon?: JSX.Element;
  /** Visible row label. */
  label: JSX.Element | string;
  /** Value passed back to `onSelect` when the row is clicked. */
  value: string;
  /** When true the row is shown but cannot be selected. */
  disabled?: boolean;
};

/**
 * Caller-supplied options for a choice dialog.
 *
 * `required: true` removes the backdrop dismiss path so the user has to pick
 * an option before the dialog can close.
 */
export type ChoiceInput = {
  title: string;
  message: JSX.Element | string;
  options: ChoiceOption[];
  required?: boolean;
};

type ChoiceDialogProps = ChoiceInput & {
  open: boolean;
  onSelect: (newValue: string) => void;
  onDismiss: () => void;
};

/**
 * Presentational dialog that lists `options` and reports the selection via
 * `onSelect`. Used by `useActionDialogs().choice(...)`.
 */
export default function ChoiceDialog(
  props: ChoiceDialogProps
): JSX.Element | null {
  const {
    title,
    message,
    options,
    open,
    required,
    onDismiss: handleClose,
    onSelect: handleListItemClick,
  } = props;

  let onClose: (() => void) | undefined = handleClose;
  if (required) {
    onClose = undefined;
  }

  return (
    <Dialog onClose={onClose} open={open} fullWidth={true}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        {message}
        <List dense>
          {options.map((option) => (
            <ListItem
              button
              onClick={() =>
                !option.disabled && handleListItemClick(option.value)
              }
              disabled={!!option.disabled}
              key={option.value}
              sx={{ alignItems: "center", display: "flex", gap: 1 }}
            >
              {!option.startIcon ? null : option.startIcon}
              <ListItemText primary={option.label} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
