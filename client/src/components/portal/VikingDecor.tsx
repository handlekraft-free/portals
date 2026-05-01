// ── Viking Decorations ────────────────────────────────────────────────────────
// Shared SVG paraphernalia used across Employee and Board portals.
// All components are aria-hidden decorative elements.

export function VikingCrossedSwords({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
      <line x1="2" y1="16" x2="16" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="2.5" cy="15.5" r="1.4" fill="currentColor" />
      <line x1="5" y1="13" x2="7" y2="15" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="16" x2="2" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" />
      <line x1="13" y1="13" x2="11" y2="15" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function VikingShieldSvg({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
      <path d="M9 17L2 12V3Q2 1 4 1H14Q16 1 16 3V12Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="9" cy="8.5" r="2.5" fill="currentColor" fillOpacity="0.45" />
      <line x1="9" y1="5.5" x2="9" y2="11.5" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" />
      <line x1="6" y1="8.5" x2="12" y2="8.5" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" />
    </svg>
  );
}

export function VikingHelmSvg({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 20 18" fill="none" aria-hidden="true" className={className}>
      <path d="M3 17Q3 8 10 7Q17 8 17 17" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 12.5Q0 8 3.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M17 12.5Q20 8 16.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <line x1="10" y1="7" x2="10" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="11.5" x2="15" y2="11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

export function VikingAxeSvg({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={Math.round(size * 0.7)} height={size} viewBox="0 0 14 22" fill="none" aria-hidden="true" className={className}>
      <line x1="7" y1="2" x2="7" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 3.5Q13.5 5.5 13.5 12Q13.5 15.5 7 15.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.25" strokeLinejoin="round" />
      <path d="M7 5.5Q3 4 1.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function VikingSwordSvg({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={Math.round(size * 0.45)} height={size} viewBox="0 0 10 22" fill="none" aria-hidden="true" className={className}>
      <line x1="5" y1="1" x2="5" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="1" y1="8" x2="9" y2="8" stroke="#D4A843" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="5" cy="20" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function RuneDivider({ className = "" }: { className?: string }) {
  return (
    <svg width="100%" height="12" viewBox="0 0 180 12" fill="none" aria-hidden="true" preserveAspectRatio="none" className={className}>
      <line x1="0" y1="6" x2="72" y2="6" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
      <path d="M76 6L80 2L84 6L88 2L92 6L96 2L100 6" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" fill="none" strokeLinejoin="round" />
      <line x1="104" y1="6" x2="180" y2="6" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

export function LongshipWatermark({ className = "" }: { className?: string }) {
  return (
    <svg width="224" height="90" viewBox="0 0 224 90" fill="none" aria-hidden="true" className={className}>
      <path d="M15 62Q35 72 112 76Q189 72 209 62L195 52Q112 58 29 52Z" fill="white" fillOpacity="0.04" />
      <path d="M209 62Q222 50 215 38L200 50Z" fill="white" fillOpacity="0.06" />
      <path d="M15 62Q5 50 10 38L25 50Z" fill="white" fillOpacity="0.06" />
      <line x1="112" y1="10" x2="112" y2="52" stroke="white" strokeOpacity="0.06" strokeWidth="2" />
      <rect x="95" y="16" width="34" height="32" rx="2" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.04" strokeWidth="1" />
      {[50, 72, 94, 112, 130, 152, 174].map((x, i) => (
        <circle key={i} cx={x} cy={55} r={6} fill="none" stroke="white" strokeOpacity="0.045" strokeWidth="1" />
      ))}
      {[55, 78, 100, 124, 148, 168].map((x, i) => (
        <line key={i} x1={x} y1={59} x2={x - 12} y2={76} stroke="white" strokeOpacity="0.04" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// Decorative row of small weapons/armor used in page headers
export function VikingArsenal({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 select-none ${className}`} aria-hidden="true">
      <VikingSwordSvg size={18} />
      <VikingShieldSvg size={16} />
      <VikingHelmSvg size={18} />
      <VikingAxeSvg size={18} />
    </span>
  );
}

const EMPLOYEE_MOTTOS = [
  "⚔️  Skál! Strike while the iron is hot.",
  "🪓  No task too mighty for this crew.",
  "🛡️  We build, therefore we are.",
  "⚔️  Onward! The backlog won't raid itself.",
  "🏔️  Higher ground, every sprint.",
  "⚓  Steady the ship. Ship the feature.",
];

const BOARD_MOTTOS = [
  "🛡️  For the hall! For the people!",
  "⚔️  Govern wisely. Act boldly.",
  "📜  Deeds, not merely words.",
  "🏛️  Strength is forged in council.",
  "⚓  Steady the ship — always.",
  "🪖  Leadership is a long game.",
];

export function VikingMotto({ type = "employee" }: { type?: "employee" | "board" }) {
  const mottos = type === "board" ? BOARD_MOTTOS : EMPLOYEE_MOTTOS;
  const motto = mottos[new Date().getDate() % mottos.length];
  return (
    <p className="text-white/22 text-[10px] italic text-center px-3 py-1.5 leading-snug select-none tracking-wide">
      {motto}
    </p>
  );
}
