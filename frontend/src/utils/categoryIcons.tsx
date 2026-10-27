import type { Icon } from "@phosphor-icons/react";
import {
  Code,
  Wrench,
  Compass,
  Circuitry,
  Flask,
  Waves,
  Fish,
  Plant,
  Leaf,
  Lightning,
  Heartbeat,
  UsersThree,
  HandHeart,
  ChartLineUp,
  Island,
  GraduationCap,
  PaintBrush,
  BookOpen,
  Megaphone,
  Scales,
  SoccerBall,
  ForkKnife,
} from "@phosphor-icons/react";

// Keyed by the icon name string the backend stores per category (see backend seed.ts).
// NOTE: "CircuitBoard" does not exist in the installed @phosphor-icons/react version
// (2.1.10); substituted with "Circuitry", the closest equivalent in the same set.
// The backend seed for category id 4 ("Electrónica y Robótica") stores the icon name
// as "CircuitBoard" — if that string is not updated to "Circuitry" to match, this map
// also exposes the "CircuitBoard" key as an alias so the lookup still resolves.
export const CATEGORY_ICON_MAP: Record<string, Icon> = {
  Code,
  Wrench,
  Compass,
  Circuitry,
  CircuitBoard: Circuitry,
  Flask,
  Waves,
  Fish,
  Plant,
  Leaf,
  Lightning,
  Heartbeat,
  UsersThree,
  HandHeart,
  ChartLineUp,
  Island,
  GraduationCap,
  PaintBrush,
  BookOpen,
  Megaphone,
  Scales,
  SoccerBall,
  ForkKnife,
};
