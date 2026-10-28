interface SkeletonProps {
  /** CSS width (e.g. "100%", "120px"). Defaults to "100%". */
  width?: string | number;
  /** CSS height (e.g. "12px"). Defaults to "1em". */
  height?: string | number;
  /** Visual shape of the placeholder. */
  shape?: "rect" | "circle" | "text";
  className?: string;
}

/**
 * Pulsing placeholder block used while real content loads. Keep the
 * composition at each call site shaped like the content it replaces (e.g.
 * stack a few of these to approximate a card or a row) instead of relying on
 * one generic block.
 */
function Skeleton({ width = "100%", height = "1em", shape = "rect", className = "" }: SkeletonProps) {
  const radiusClass = shape === "circle" ? "rounded-full" : shape === "text" ? "rounded" : "rounded-lg";
  const w = typeof width === "number" ? `${width}px` : width;
  const h = typeof height === "number" ? `${height}px` : height;

  return (
    <span
      aria-hidden="true"
      style={{ width: w, height: h }}
      className={`block shrink-0 bg-surface-ground animate-pulse motion-reduce:animate-none ${radiusClass} ${className}`}
    />
  );
}

export default Skeleton;
