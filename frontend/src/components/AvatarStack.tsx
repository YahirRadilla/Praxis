import { avatarColorFor } from "../utils/avatarColor";

interface AvatarStackPerson {
  id: number;
  name: string;
}

interface AvatarStackProps {
  people: AvatarStackPerson[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_STYLES = {
  sm: {
    wrapper: "-space-x-1.5",
    avatar: "w-6 h-6 text-[9px]",
    overflow: "w-6 h-6 text-[8.5px]",
  },
  md: {
    wrapper: "-space-x-2",
    avatar: "w-8 h-8 text-[11px]",
    overflow: "w-8 h-8 text-[10.5px]",
  },
} as const;

function AvatarStack({ people, max = 5, size = "md", className }: AvatarStackProps) {
  const styles = SIZE_STYLES[size];
  const overflowCount = people.length - max;

  return (
    <div className={`flex items-center ${styles.wrapper}${className ? ` ${className}` : ""}`}>
      {people.slice(0, max).map((m) => (
        <span
          key={m.id}
          title={m.name}
          style={{ backgroundColor: avatarColorFor(m.id) }}
          className={`${styles.avatar} rounded-full border-2 border-paper-raised flex items-center justify-center text-white font-bold`}
        >
          {m.name.charAt(0).toUpperCase()}
        </span>
      ))}
      {overflowCount > 0 && (
        <span
          className={`${styles.overflow} rounded-full border-2 border-paper-raised bg-surface-ground flex items-center justify-center text-ink-soft font-bold`}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}

export default AvatarStack;
