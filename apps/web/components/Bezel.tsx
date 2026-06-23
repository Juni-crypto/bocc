import type { CSSProperties, ReactNode } from "react";

/**
 * Double-bezel card: outer shell (rgba shell + 1px hairline) wrapping an inner
 * core (#0E0E10) with concentric radii. Mirrors `.bezel`/`.bezel-core` from the
 * mockup.
 */
export function Bezel({
  children,
  className = "",
  coreClassName = "",
  viewfinder = false,
  style,
  coreStyle,
}: {
  children: ReactNode;
  className?: string;
  coreClassName?: string;
  viewfinder?: boolean;
  style?: CSSProperties;
  coreStyle?: CSSProperties;
}) {
  return (
    <div className={`bezel ${viewfinder ? "vf" : ""} ${className}`} style={style}>
      <div className={`bezel-core ${coreClassName}`} style={coreStyle}>
        {children}
      </div>
    </div>
  );
}
