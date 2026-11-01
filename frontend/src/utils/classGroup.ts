import type { ClassGroup, ClassGroupCounts } from "../types/class-group";

/**
 * `_count` only arrives on the preview/member/joined-list tiers; `GET
 * /class-groups/mine` returns the full `resources`/`projects` arrays with
 * no `_count` at all (it reuses the owner-only `classGroupInclude`, not a
 * tiered select). This normalizes either shape into one counts object so
 * card rendering doesn't need to branch on which endpoint produced it.
 * `members` has no array fallback: it's never present on `/mine`.
 */
export function classGroupCounts(classGroup: ClassGroup): ClassGroupCounts {
  return {
    resources: classGroup._count?.resources ?? classGroup.resources?.length ?? 0,
    members: classGroup._count?.members ?? classGroup.members?.length ?? 0,
    projects: classGroup._count?.projects ?? classGroup.projects?.length ?? 0,
  };
}
