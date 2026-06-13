import type { CSSProperties } from "react";

type LogoMarkProps = {
  size?: number;
  className?: string;
  label?: string;
};

type LogoLockupProps = {
  markSize?: number;
  className?: string;
  compact?: boolean;
};

export function SquareLogoMark({ size = 44, className = "", label = "Square" }: LogoMarkProps) {
  const style = { "--sq-logo-size": `${size}px` } as CSSProperties;

  return (
    <span
      className={`square-logo-mark ${className}`}
      style={style}
      role="img"
      aria-label={label}
    >
      <span className="square-logo-symbol" aria-hidden="true">
        <span className="square-logo-tile square-logo-tile-tl" />
        <span className="square-logo-tile square-logo-tile-tr" />
        <span className="square-logo-tile square-logo-tile-bl" />
        <span className="square-logo-tile square-logo-tile-br" />
        <span className="square-logo-core" />
      </span>
    </span>
  );
}

export function SquareLogoLockup({ markSize = 42, className = "", compact = false }: LogoLockupProps) {
  return (
    <span className={`square-logo-lockup ${compact ? "square-logo-lockup-compact" : ""} ${className}`}>
      <SquareLogoMark size={markSize} label="Square" />
      <span className="square-logo-copy" aria-label="Square 청주고등학교 커뮤니티">
        <span className="square-logo-name">Square</span>
        <span className="square-logo-subtitle">청주고등학교 커뮤니티</span>
      </span>
    </span>
  );
}
