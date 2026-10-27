import type { ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  /** Destructive variant: red confirm button, for irreversible actions. */
  danger?: boolean;
}

function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onClose,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} transition className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/40 transition-opacity duration-150 motion-reduce:transition-none data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className={`w-full max-w-[380px] bg-paper-raised rounded-2xl border border-rule flex flex-col gap-3 p-5 transition duration-150 motion-reduce:transition-none data-closed:opacity-0 data-closed:scale-95 ${CARD_SHADOW}`}
          >
            <DialogTitle className="font-heading text-[15px] font-bold text-ink m-0">{title}</DialogTitle>
            {description && <p className="text-[12.5px] text-ink-soft m-0">{description}</p>}
            {children}
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full text-[12.5px] font-semibold px-4 py-2 text-ink-soft hover:text-ink cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={
                  danger
                    ? "rounded-full text-[12.5px] font-bold px-4 py-2 cursor-pointer text-white bg-[#A21942] hover:bg-[#8a1638]"
                    : `rounded-full text-[12.5px] font-bold px-4 py-2 cursor-pointer ${PRIMARY_BUTTON}`
                }
              >
                {confirmLabel}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;
