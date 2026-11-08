export interface StatusStyle {
  label: string;
  bg: string;
  fg: string;
}

// bg/fg below are `var(--color-...)` references into global.css's
// theme-reactive tokens instead of fixed hex, so every consumer (StatusPill,
// PriorityPill, BoardColumn, ActivityCardMenu, ActivityDetailModal,
// ActivityTable, ProjectCard/Row/Detail, EditProfile, MisTareas — all of
// which apply `.bg`/`.fg` as inline style values or as Phosphor icons'
// `color` prop, which is forwarded straight to the SVG's `fill` attribute)
// needed NO changes: a CSS var string works everywhere a literal hex string
// did. Previously these were bare hex with no dark-mode variant at all, so
// every status/priority/visibility/verdict badge rendered as a stray
// light-mode pastel square in dark mode. See global.css's
// `--color-status-*`/`--color-activity-*`/`--color-priority-*`/
// `--color-verdict-*` tokens for the light/dark hex values and their
// verified WCAG AA contrast ratios.

export const PROJECT_VISIBILITY: Record<string, StatusStyle> = {
  PUBLIC: { label: "Público", bg: "var(--color-status-public-bg)", fg: "var(--color-status-public-fg)" },
  PRIVATE: { label: "Privado", bg: "var(--color-status-private-bg)", fg: "var(--color-status-private-fg)" },
};

export const PROJECT_ARCHIVED: StatusStyle = {
  label: "Archivado",
  bg: "var(--color-status-archived-bg)",
  fg: "var(--color-status-archived-fg)",
};

export const USER_VERIFIED: StatusStyle = {
  label: "Cuenta verificada ✓",
  bg: "var(--color-status-verified-bg)",
  fg: "var(--color-status-verified-fg)",
};

export const ACTIVITY_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "Pendiente", bg: "var(--color-activity-pending-bg)", fg: "var(--color-activity-pending-fg)" },
  IN_PROGRESS: {
    label: "En progreso",
    bg: "var(--color-activity-inprogress-bg)",
    fg: "var(--color-activity-inprogress-fg)",
  },
  TO_VALIDATE: {
    label: "Por validar",
    bg: "var(--color-activity-tovalidate-bg)",
    fg: "var(--color-activity-tovalidate-fg)",
  },
  DONE: { label: "Completada", bg: "var(--color-activity-done-bg)", fg: "var(--color-activity-done-fg)" },
  OVERDUE: { label: "Atrasada", bg: "var(--color-activity-overdue-bg)", fg: "var(--color-activity-overdue-fg)" },
};

export const ACTIVITY_PRIORITY: Record<string, StatusStyle> = {
  BAJA: { label: "Baja", bg: "var(--color-priority-low-bg)", fg: "var(--color-priority-low-fg)" },
  MEDIA: { label: "Media", bg: "var(--color-priority-medium-bg)", fg: "var(--color-priority-medium-fg)" },
  ALTA: { label: "Alta", bg: "var(--color-priority-high-bg)", fg: "var(--color-priority-high-fg)" },
};

// Labels reframed as ongoing, non-binding feedback (plan decision #4):
// a Dictamen is retroalimentación, not a formal verdict that closes
// anything. The underlying DictamenVerdict enum values are unchanged.
export const DICTAMEN_VERDICT: Record<string, StatusStyle> = {
  APPROVED: { label: "Va bien", bg: "var(--color-verdict-approved-bg)", fg: "var(--color-verdict-approved-fg)" },
  CHANGES_REQUESTED: {
    label: "Sugiere cambios",
    bg: "var(--color-verdict-changes-bg)",
    fg: "var(--color-verdict-changes-fg)",
  },
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
