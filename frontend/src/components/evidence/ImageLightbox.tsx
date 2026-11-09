import { useEffect } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import type { Evidence } from "../../types/activity";

interface ImageLightboxProps {
  images: Evidence[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const open = index !== null;
  const total = images.length;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (index === null) return;

      if (event.key === "ArrowLeft") {
        onIndexChange((index - 1 + total) % total);
      } else if (event.key === "ArrowRight") {
        onIndexChange((index + 1) % total);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, index, total, onIndexChange]);

  if (index === null) return null;

  const current = images[index];

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
            className="relative flex items-center justify-center transition duration-150 motion-reduce:transition-none data-closed:opacity-0 data-closed:scale-95"
          >
            <DialogTitle className="sr-only">{current.fileName ?? "Imagen"}</DialogTitle>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute -top-10 right-0 text-white/90 hover:text-white cursor-pointer"
            >
              <X size={24} weight="bold" />
            </button>

            {total > 1 && (
              <button
                type="button"
                onClick={() => onIndexChange((index - 1 + total) % total)}
                aria-label="Anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/40 text-white p-2 hover:bg-ink/60 cursor-pointer"
              >
                <CaretLeft size={20} weight="bold" />
              </button>
            )}

            <img
              src={current.url}
              alt={current.fileName ?? "Imagen"}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            />

            {total > 1 && (
              <button
                type="button"
                onClick={() => onIndexChange((index + 1) % total)}
                aria-label="Siguiente"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/40 text-white p-2 hover:bg-ink/60 cursor-pointer"
              >
                <CaretRight size={20} weight="bold" />
              </button>
            )}

            {total > 1 && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[12px] font-data text-white/90">
                {index + 1} / {total}
              </span>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default ImageLightbox;
