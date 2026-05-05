import { useMemo } from "react";
import type { Rank } from "@shared/xp";

export interface AvatarConfig {
  helm?: string | null;
  cloak?: string | null;
  beard?: string | null;
  emblem?: string | null;
}

export const HELM_OPTIONS   = ["none", "ironcap", "horned", "winged"] as const;
export const CLOAK_OPTIONS  = ["none", "wool", "fur", "royal"] as const;
export const BEARD_OPTIONS  = ["none", "short", "long", "braided"] as const;
export const EMBLEM_OPTIONS = ["none", "raven", "wolf", "tree"] as const;

export type HelmOpt   = typeof HELM_OPTIONS[number];
export type CloakOpt  = typeof CLOAK_OPTIONS[number];
export type BeardOpt  = typeof BEARD_OPTIONS[number];
export type EmblemOpt = typeof EMBLEM_OPTIONS[number];

export interface AvatarRendererProps {
  initials: string;
  config?: AvatarConfig | null;
  size?: number;             // px; default 36
  ringColor?: string;        // override ring color
}

// Server-aligned XP thresholds (mirrors shared/xp.ts and routes-auth.ts).
export function unlocksForXp(xp: number) {
  return {
    helm:   xp >= 200,
    cloak:  xp >= 1500,
    beard:  xp >= 600,
    emblem: xp >= 6000,
  };
}

export function unlocksForRank(rank: Rank | null | undefined) {
  // Rank thresholds mirror unlocksForXp but accept a Rank for callers that
  // already have it. Falls back to all locked when rank is unknown.
  if (!rank) return { helm: false, cloak: false, beard: false, emblem: false };
  return unlocksForXp(rank.threshold);
}

// SVG-based renderer — no asset files. Layered: base disc → cloak → face →
// beard → helm → emblem. All optional.
export function AvatarRenderer({ initials, config, size = 36, ringColor = "#D4A843" }: AvatarRendererProps) {
  const { helm, cloak, beard, emblem } = useMemo(() => ({
    helm:   (config?.helm   ?? "none") as HelmOpt,
    cloak:  (config?.cloak  ?? "none") as CloakOpt,
    beard:  (config?.beard  ?? "none") as BeardOpt,
    emblem: (config?.emblem ?? "none") as EmblemOpt,
  }), [config]);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label="Hero avatar"
      data-testid="avatar-renderer"
    >
      {/* Ring */}
      <circle cx="32" cy="32" r="31" fill="none" stroke={ringColor} strokeOpacity="0.45" strokeWidth="2" />
      {/* Cloak (sits behind face, peeks below disc) */}
      {cloak !== "none" && <CloakLayer variant={cloak} />}
      {/* Face disc */}
      <defs>
        <linearGradient id="hk-avatar-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#0D7377" />
          <stop offset="100%" stopColor="#0a5f62" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#hk-avatar-face)" />
      {/* Initials */}
      <text
        x="32" y="38"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="Outfit, system-ui, sans-serif"
      >
        {initials}
      </text>
      {/* Beard sits on top of the face initials' lower edge */}
      {beard !== "none" && <BeardLayer variant={beard} />}
      {/* Helm covers the top */}
      {helm !== "none" && <HelmLayer variant={helm} />}
      {/* Emblem badge — bottom-right */}
      {emblem !== "none" && <EmblemLayer variant={emblem} />}
    </svg>
  );
}

// ── Layer sub-components (deliberately tiny SVG paths) ─────────────────────

function HelmLayer({ variant }: { variant: HelmOpt }) {
  if (variant === "ironcap") {
    return (
      <g>
        <path d="M10 26 Q32 6 54 26 L54 30 L10 30 Z" fill="#5b6470" stroke="#1A1F2B" strokeWidth="1" />
        <line x1="32" y1="8" x2="32" y2="30" stroke="#1A1F2B" strokeWidth="1" />
      </g>
    );
  }
  if (variant === "horned") {
    return (
      <g>
        <path d="M10 26 Q32 6 54 26 L54 30 L10 30 Z" fill="#3a4252" stroke="#1A1F2B" strokeWidth="1" />
        <path d="M10 26 Q4 18 2 12" fill="none" stroke="#e8d6a8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M54 26 Q60 18 62 12" fill="none" stroke="#e8d6a8" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  }
  if (variant === "winged") {
    return (
      <g>
        <path d="M10 26 Q32 6 54 26 L54 30 L10 30 Z" fill="#2a3142" stroke="#1A1F2B" strokeWidth="1" />
        <path d="M8 22 Q2 18 4 10 Q10 14 12 22 Z" fill="#D4A843" />
        <path d="M56 22 Q62 18 60 10 Q54 14 52 22 Z" fill="#D4A843" />
      </g>
    );
  }
  return null;
}

function CloakLayer({ variant }: { variant: CloakOpt }) {
  const fill =
    variant === "wool"  ? "#8a8276" :
    variant === "fur"   ? "#5e3b1f" :
    "#7a1f3a"; // royal
  return (
    <g>
      <path
        d="M4 56 Q4 40 14 36 L50 36 Q60 40 60 56 L60 64 L4 64 Z"
        fill={fill}
        stroke="#1A1F2B" strokeWidth="0.75"
      />
      {variant === "fur" && (
        <path d="M14 36 Q32 32 50 36" fill="none" stroke="#d8c9a3" strokeWidth="2" strokeLinecap="round" />
      )}
      {variant === "royal" && (
        <circle cx="32" cy="40" r="2" fill="#D4A843" />
      )}
    </g>
  );
}

function BeardLayer({ variant }: { variant: BeardOpt }) {
  if (variant === "short") {
    return <path d="M22 44 Q32 50 42 44 Q42 52 32 54 Q22 52 22 44 Z" fill="#3a2a1a" />;
  }
  if (variant === "long") {
    return <path d="M20 42 Q32 52 44 42 Q44 60 32 60 Q20 60 20 42 Z" fill="#2a1a0e" />;
  }
  if (variant === "braided") {
    return (
      <g>
        <path d="M22 44 Q32 52 42 44 Q42 56 32 58 Q22 56 22 44 Z" fill="#3a2a1a" />
        <circle cx="29" cy="60" r="1.5" fill="#D4A843" />
        <circle cx="35" cy="60" r="1.5" fill="#D4A843" />
      </g>
    );
  }
  return null;
}

function EmblemLayer({ variant }: { variant: EmblemOpt }) {
  const cx = 50, cy = 50, r = 8;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#1A1F2B" stroke="#D4A843" strokeWidth="1.5" />
      {variant === "raven" && (
        <path d={`M${cx - 4} ${cy + 1} Q${cx} ${cy - 4} ${cx + 4} ${cy + 1} L${cx + 2} ${cy + 3} L${cx - 2} ${cy + 3} Z`} fill="#D4A843" />
      )}
      {variant === "wolf" && (
        <path d={`M${cx - 4} ${cy + 3} L${cx - 3} ${cy - 3} L${cx - 1} ${cy - 1} L${cx + 1} ${cy - 1} L${cx + 3} ${cy - 3} L${cx + 4} ${cy + 3} Z`} fill="#D4A843" />
      )}
      {variant === "tree" && (
        <g stroke="#D4A843" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} />
          <line x1={cx} y1={cy - 2} x2={cx - 3} y2={cy - 4} />
          <line x1={cx} y1={cy - 2} x2={cx + 3} y2={cy - 4} />
          <line x1={cx} y1={cy + 1} x2={cx - 3} y2={cy - 1} />
          <line x1={cx} y1={cy + 1} x2={cx + 3} y2={cy - 1} />
        </g>
      )}
    </g>
  );
}
