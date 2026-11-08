import { useEffect, useState } from "react";
import { Warning } from "@phosphor-icons/react";
import { CARD_SHADOW } from "../utils/statusStyles";

interface FieldValidationHintProps {
  /** The text to show inside the callout. */
  message: string;
  /** Whether the hint is currently visible. Conditionally renders `null`
   * when false instead of just hiding visually, so a dismissed hint never
   * sits over the field intercepting clicks. */
  show: boolean;
}

/**
 * A small floating callout that replaces the browser's native HTML5
 * constraint-validation popup ("Completa este campo"). The field wrapper
 * this is rendered inside must be `relative` so it anchors just below the
 * field.
 */
function FieldValidationHint({ message, show }: FieldValidationHintProps) {
  // Drives the enter transition: mount at opacity-0/scale-95, then flip to
  // the visible state on the next frame so the transition actually plays
  // instead of starting already-visible.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!show) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="alert"
      className={`absolute left-0 top-full z-20 mt-2.5 flex items-start gap-2 rounded-lg border border-danger/30 bg-paper-raised px-3 py-2 max-w-[280px] transition-all duration-150 motion-reduce:transition-none ${CARD_SHADOW} ${
        entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute -top-[5px] left-4 h-2.5 w-2.5 rotate-45 border-l border-t border-danger/30 bg-paper-raised"
      />
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
        <Warning size={12} weight="bold" />
      </span>
      <p className="text-[12.5px] text-ink leading-snug m-0">{message}</p>
    </div>
  );
}

export default FieldValidationHint;
