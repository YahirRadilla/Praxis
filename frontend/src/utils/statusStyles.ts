export interface StatusStyle {
  label: string;
  bg: string;
  fg: string;
}

export const PROJECT_VISIBILITY: Record<string, StatusStyle> = {
  PUBLIC: { label: "Público", bg: "#EAF4EA", fg: "#2D5E3A" },
  PRIVATE: { label: "Privado", bg: "#F0EFEC", fg: "#5A6069" },
};

// fg darkened from #8B9199 (~2.76:1 on this bg, fails WCAG AA) to ~5.04:1.
export const PROJECT_ARCHIVED: StatusStyle = { label: "Archivado", bg: "#F0EFEC", fg: "#5F6670" };

export const ACTIVITY_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "Pendiente", bg: "#F0EFEC", fg: "#5A6069" },
  // fg darkened from #0A97D9 (~2.8:1 on this bg, fails WCAG AA) to ~5.8:1.
  IN_PROGRESS: { label: "En progreso", bg: "#E8F1F7", fg: "#09608F" },
  TO_VALIDATE: { label: "Por validar", bg: "#E5F3EC", fg: "#19486A" },
  DONE: { label: "Completada", bg: "#EAF4EA", fg: "#2D5E3A" },
  OVERDUE: { label: "Atrasada", bg: "#FBE9E7", fg: "#A21942" },
};

export const ACTIVITY_PRIORITY: Record<string, StatusStyle> = {
  BAJA: { label: "Baja", bg: "#F0EFEC", fg: "#5A6069" },
  // fg darkened from #BF8B2E (~2.7:1 on this bg, fails WCAG AA) to ~5.9:1.
  MEDIA: { label: "Media", bg: "#FDF3E0", fg: "#7A581A" },
  ALTA: { label: "Alta", bg: "#FBE9E7", fg: "#A21942" },
};

// Labels reframed as ongoing, non-binding feedback (plan decision #4):
// a Dictamen is retroalimentación, not a formal verdict that closes
// anything. The underlying DictamenVerdict enum values are unchanged.
export const DICTAMEN_VERDICT: Record<string, StatusStyle> = {
  APPROVED: { label: "Va bien", bg: "#EAF4EA", fg: "#2D5E3A" },
  // fg darkened from #BF8B2E (~2.75:1 on this bg, fails WCAG AA) to ~5.89:1.
  CHANGES_REQUESTED: { label: "Sugiere cambios", bg: "#FDF3E0", fg: "#7A581A" },
};

export const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(20,22,26,0.04),0_10px_28px_-14px_rgba(20,22,26,0.18)]";

// hover bg was hardcoded #234d30 paired with text-paper. In light mode
// text-paper is near-white (#fbfaf8) on that dark green -> ~9.25:1, fine.
// In dark mode text-paper is near-black (#15171a, --color-paper's dark
// value) on that SAME hardcoded dark green -> ~1.86:1, fails badly (the
// near-invisible hover bug). Fixed by tokenizing both the hover bg and its
// text color: --color-primary-hover stays #234d30 in both themes, but
// --color-primary-hover-text switches from near-white paper (light) to
// near-white ink (dark) instead of following --color-paper. New contrast:
// light ~9.25:1 (unchanged), dark ~8.31:1 (was ~1.86:1).
export const PRIMARY_BUTTON =
  "bg-accent-primary text-paper hover:bg-primary-hover hover:text-primary-hover-text shadow-[0_4px_14px_-4px_rgba(45,94,58,0.5)] disabled:shadow-none";
