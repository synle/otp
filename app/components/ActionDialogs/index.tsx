import React from 'react';
import AlertDialog from "~/components/ActionDialogs/AlertDialog";
import ChoiceDialog from "~/components/ActionDialogs/ChoiceDialog";
import ModalDialog from "~/components/ActionDialogs/ModalDialog";
import PromptDialog from "~/components/ActionDialogs/PromptDialog";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";

type ActionDialogsProps = {};

export default function ActionDialogs(
  props: ActionDialogsProps
): JSX.Element | null {
  const { dialogs, dismiss } = useActionDialogs();

  if(!dialogs || dialogs.length === 0){
    return null;
  }

  return <>
  {
      dialogs.map((dialog, idx) => {
        if (!dialog) {
          return null;
        }

        const onConfirmSubmit = () => {
          dismiss();
          dialog.onSubmit && dialog.onSubmit(true);
        };
        const onPromptSaveClick = (newValue?: string) => {
          dismiss();
          dialog.onSubmit && dialog.onSubmit(true, newValue);
        };
        const onChoiceSelect = (newValue?: string) => {
          dismiss();
          dialog.onSubmit && dialog.onSubmit(true, newValue);
        };
        const onDimiss = () => {
          dismiss();
          dialog.onSubmit && dialog.onSubmit(false);
        };

        let contentDom = <></>
        switch (dialog.type) {
          case "alert":
            contentDom = (
              <AlertDialog
                open={true}
                title="Alert"
                message={dialog.message}
                onDismiss={onDimiss}
                isConfirm={false}
              />
            );
          case "confirm":
            contentDom = (
              <AlertDialog
                open={true}
                title="Confirmation"
                message={dialog.message}
                yesLabel={dialog.yesLabel}
                onYesClick={onConfirmSubmit}
                onDismiss={onDimiss}
                isConfirm={true}
              />
            );
          case "prompt":
            contentDom = (
              <PromptDialog
                open={true}
                title={dialog.title}
                message={dialog.message}
                value={dialog.value}
                onSaveClick={onPromptSaveClick}
                onDismiss={onDimiss}
                languageMode={dialog.languageMode}
                isLongPrompt={dialog.isLongPrompt}
                saveLabel={dialog.saveLabel}
                required={dialog.required}
                readonly={dialog.readonly}
              />
            );
          case "choice":
            contentDom = (
              <ChoiceDialog
                open={true}
                title={dialog.title}
                message={dialog.message}
                options={dialog.options}
                onSelect={onChoiceSelect}
                onDismiss={onDimiss}
                required={dialog.required}
              />
            );
          case "modal":
            contentDom = (
              <ModalDialog
                open={true}
                title={dialog.title}
                message={dialog.message}
                onDismiss={onDimiss}
                showCloseButton={!!dialog.showCloseButton}
                disableBackdropClick={!!dialog.disableBackdropClick}
                size={dialog.size}
              />
            );
        }

        return <React.Fragment key={idx}>{contentDom}</React.Fragment>
      })
  }
  </>
}
