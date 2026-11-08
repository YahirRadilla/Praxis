import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_DISMISS_MS = 3500;
const DEFAULT_MESSAGE = "Completa este campo.";

export interface RequiredFieldCheck {
  /** Identifies the field this check is for — matched against `isHintVisible`. */
  key: string;
  value: string;
  /** Overrides the default "Completa este campo." message for this field. */
  message?: string;
}

interface FieldHintState {
  key: string;
  message: string;
}

/**
 * Shared state for showing a transient "you forgot this field" hint next to
 * a form field, replacing the browser's native HTML5 constraint-validation
 * popup. Only one hint is shown at a time, matching the native behavior of
 * flagging the first invalid field on submit.
 */
export function useRequiredFieldHint() {
  const [hint, setHint] = useState<FieldHintState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const dismissHint = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHint(null);
  }, []);

  const showHint = useCallback((key: string, message: string = DEFAULT_MESSAGE) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHint({ key, message });
    timeoutRef.current = setTimeout(() => {
      setHint(null);
      timeoutRef.current = null;
    }, AUTO_DISMISS_MS);
  }, []);

  /**
   * Checks every field in order and, on the first blank one, shows its hint
   * and returns `false` so the caller can abort submission — mirroring the
   * native browser's "flag the first invalid field" behavior. Returns
   * `true` only when every field is non-empty.
   */
  const validateRequired = useCallback(
    (fields: RequiredFieldCheck[]): boolean => {
      const firstEmpty = fields.find((f) => f.value.trim() === "");
      if (firstEmpty) {
        showHint(firstEmpty.key, firstEmpty.message ?? DEFAULT_MESSAGE);
        return false;
      }
      return true;
    },
    [showHint],
  );

  const isHintVisible = useCallback((key: string) => hint?.key === key, [hint]);

  return {
    hintKey: hint?.key ?? null,
    hintMessage: hint?.message ?? "",
    validateRequired,
    showHint,
    dismissHint,
    isHintVisible,
  };
}

export default useRequiredFieldHint;
