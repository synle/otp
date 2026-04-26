import { createContext, useContext, useState } from "react";
import { AlertInput } from "~/components/ActionDialogs/AlertDialog";
import {
  ChoiceInput,
  ChoiceOption,
} from "~/components/ActionDialogs/ChoiceDialog";
import { ModalInput } from "~/components/ActionDialogs/ModalDialog";
import { PromptInput } from "~/components/ActionDialogs/PromptDialog";
import ActionDialogs from "~/components/ActionDialogs";

/**
 * Common shape shared by all dialog descriptors stored in the stack.
 */
type BaseDialog = {
  /** Stable react key for the dialog instance; generated from a monotonic counter. */
  key: string;
};

type AlertActionDialog = BaseDialog &
  AlertInput & {
    type: "alert";
    message: string | JSX.Element;
    onSubmit?: () => void;
  };

type ConfirmActionDialog = BaseDialog & {
  type: "confirm";
  message: string | JSX.Element;
  yesLabel?: string;
  onSubmit: (yesSelected: boolean) => void;
};

type ChoiceActionDialog = BaseDialog &
  ChoiceInput & {
    type: "choice";
    onSubmit: (yesSelected: boolean, selectedChoice?: string) => void;
  };

type PromptActionDialog = BaseDialog &
  PromptInput & {
    type: "prompt";
    onSubmit: (yesSelected: boolean, newValue?: string) => void;
  };

type ModalActionDialog = BaseDialog &
  ModalInput & {
    type: "modal";
    onSubmit: (closed: boolean) => void;
  };

/** Discriminated union covering every kind of dialog the app can open. */
type ActionDialog =
  | AlertActionDialog
  | ConfirmActionDialog
  | PromptActionDialog
  | ChoiceActionDialog
  | ModalActionDialog;

/**
 * Module-level dialog stack. Held outside React state so callers from non-render
 * code paths (e.g. event handlers) can `push` without needing a re-render to
 * happen first; `setData` then nudges React to rerender consumers.
 */
let _actionDialogs: ActionDialog[] = [];

/** Monotonic counter used to mint unique react keys for each dialog instance. */
let modalId = Date.now();

/**
 * React context that exposes the current dialog stack and a setter to mutate
 * it. Consumers should use the `useActionDialogs` hook instead of reaching
 * into this context directly.
 */
const TargetContext = createContext({
  data: _actionDialogs,
  setData: (_newDialogs: ActionDialog[]) => {},
});

/**
 * Top-level provider that owns the dialog stack state and renders the
 * `<ActionDialogs />` component which projects the stack to the DOM.
 *
 * Wrap this around any subtree that needs to call `useActionDialogs`.
 */
export default function WrappedContext(props: {
  children: JSX.Element;
}): JSX.Element | null {
  // State to hold the theme value
  const [data, setData] = useState(_actionDialogs);
  // Provide the theme value and toggle function to the children components
  return (
    <TargetContext.Provider value={{ data, setData }}>
      {props.children}
      <ActionDialogs />
    </TargetContext.Provider>
  );
}

/**
 * Imperative dialog API.
 *
 * Each opener returns a Promise that resolves on successful submit and rejects
 * on dismiss/cancel, so callers can `await` user input inline:
 *
 *   const name = await prompt({ message: "New name?" });
 *
 * @returns Object with `dialogs` / `dialog` (current state) and the openers
 *          `alert`, `prompt`, `confirm`, `choice`, `modal`, plus `dismiss`.
 */
export function useActionDialogs() {
  const { data, setData } = useContext(TargetContext)!;

  /** Open a prompt dialog and resolve with the entered value, or reject on cancel. */
  const prompt = (props: PromptInput): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
      _actionDialogs.push({
        key: `modal.${modalId++}`,
        type: "prompt",
        onSubmit: (yesSelected, newValue) => {
          yesSelected ? resolve(newValue) : reject();
        },
        ...props,
      });
      _invalidateQueries();
    });
  };

  /** Open a yes/no confirmation. Resolves on Yes, rejects on No/dismiss. */
  const confirm = (
    message: string | JSX.Element,
    yesLabel?: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      _actionDialogs.push({
        key: `modal.${modalId++}`,
        type: "confirm",
        message,
        yesLabel,
        onSubmit: (yesSelected) => {
          yesSelected ? resolve() : reject();
        },
      });
      _invalidateQueries();
    });
  };

  /** Open a choice list and resolve with the selected `value`. */
  const choice = (
    title: string,
    message: string | JSX.Element,
    options: ChoiceOption[],
    required?: boolean
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      _actionDialogs.push({
        key: `modal.${modalId++}`,
        type: "choice",
        title,
        message,
        options,
        onSubmit: (yesSelected, newValue) => {
          yesSelected && newValue ? resolve(newValue) : reject();
        },
        required,
      });
      _invalidateQueries();
    });
  };

  /** Open an alert dialog (informational, single OK button). */
  const alert = (message: string | JSX.Element): Promise<void> => {
    return new Promise((resolve, reject) => {
      _actionDialogs.push({
        key: `modal.${modalId++}`,
        type: "alert",
        message,
      });
      _invalidateQueries();
    });
  };

  /** Open a generic modal whose body is supplied by the caller. */
  const modal = (props: ModalInput): Promise<void> => {
    return new Promise((resolve, reject) => {
      _actionDialogs.push({
        key: `modal.${modalId++}`,
        type: "modal",
        onSubmit: () => {},
        ...props,
      });
      _invalidateQueries();
    });
  };

  // The currently visible dialog (top of stack). `undefined` when the stack is empty.
  let dialog;
  try {
    if (data) {
      dialog = data[data.length - 1];
    }
  } catch (err) {
    dialog = undefined;
  }

  /**
   * Close a dialog. With no argument, closes the topmost one.
   *
   * @param modalIdToDismiss - Key of a specific dialog to close (used to dismiss out-of-order).
   */
  const dismiss = (modalIdToDismiss?: string) => {
    if (modalIdToDismiss) {
      _actionDialogs = _actionDialogs.filter(
        (modal) => modal.key !== modalIdToDismiss
      );
    } else {
      _actionDialogs.pop();
    }
    _invalidateQueries();
  };

  /**
   * Re-allocate the dialog array and push it into React state to force a
   * rerender of components depending on the stack.
   */
  function _invalidateQueries() {
    _actionDialogs = [..._actionDialogs];
    setData(_actionDialogs);
  }

  return {
    dialogs: data,
    dialog,
    alert,
    prompt,
    confirm,
    choice,
    dismiss,
    modal,
  };
}
