import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "@phosphor-icons/react";
import type { Evidence } from "../../types/activity";

interface PdfViewerDialogProps {
  pdf: Evidence | null;
  onClose: () => void;
}

function PdfViewerDialog({ pdf, onClose }: PdfViewerDialogProps) {
  const open = pdf !== null;

  if (pdf === null) return null;

  const title = pdf.fileName ?? "Documento PDF";

  return (
    <Dialog open={open} onClose={onClose} transition className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/40 transition-opacity duration-150 motion-reduce:transition-none data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto scroll-thin">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-[min(960px,95vw)] h-[90vh] flex flex-col bg-paper-raised rounded-xl border border-rule transition duration-150 motion-reduce:transition-none data-closed:opacity-0 data-closed:scale-95"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-rule">
              <DialogTitle className="font-heading text-[14px] font-bold text-ink m-0 truncate">
                {title}
              </DialogTitle>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-semibold text-ink-soft hover:text-ink"
                >
                  Abrir en pestaña nueva
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="text-ink-soft hover:text-ink cursor-pointer"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            </div>

            <iframe src={pdf.url} title={title} className="flex-1 w-full rounded-b-xl border-0" />

            <p className="text-[11px] text-ink-faint px-4 py-1.5">
              ¿No ves el documento? Ábrelo en una pestaña nueva.
            </p>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default PdfViewerDialog;
