export const AVATAR_COLORS = ["#19486A", "#A21942", "#3F7E44", "#BF8B2E", "#0A97D9"];

export function avatarColorFor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}
