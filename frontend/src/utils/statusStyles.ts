export interface StatusStyle {
  label: string;
  bg: string;
  fg: string;
}

export const PROJECT_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Borrador", bg: "#F0EFEC", fg: "#5A6069" },
  PUBLISHED: { label: "Publicado", bg: "#EAF4EA", fg: "#2D5E3A" },
  IN_PROGRESS: { label: "En desarrollo", bg: "#E8F1F7", fg: "#0A97D9" },
  IN_REVIEW: { label: "En evaluación", bg: "#FDF3E0", fg: "#BF8B2E" },
  COMPLETED: { label: "Completado", bg: "#E5F3EC", fg: "#19486A" },
  ARCHIVED: { label: "Archivado", bg: "#F0EFEC", fg: "#8B9199" },
};

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

export const DICTAMEN_VERDICT: Record<string, StatusStyle> = {
  APPROVED: { label: "Aprobado", bg: "#EAF4EA", fg: "#2D5E3A" },
  CHANGES_REQUESTED: { label: "Requiere ajustes", bg: "#FDF3E0", fg: "#BF8B2E" },
};

export const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(20,22,26,0.04),0_10px_28px_-14px_rgba(20,22,26,0.18)]";

export const PRIMARY_BUTTON =
  "bg-accent-primary text-paper hover:bg-[#234d30] shadow-[0_4px_14px_-4px_rgba(45,94,58,0.5)] disabled:shadow-none";
