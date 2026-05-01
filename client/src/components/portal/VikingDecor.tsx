// ── Viking Decorations ────────────────────────────────────────────────────────
// Shared SVG paraphernalia used across Employee and Board portals.
// All components are aria-hidden decorative elements.

import { useLocation } from "wouter";
import vikingProudPath from "@/assets/images/viking-proud.png";
import vikingCodingPath from "@/assets/images/viking-coding.png";
import vikingShieldPath from "@/assets/images/viking-shield.png";
import vikingTriumphPath from "@/assets/images/viking-triumph.png";
import vikingLostPath from "@/assets/images/viking-lost.png";
import vikingWavePath from "@/assets/images/viking-wave.png";

// ── Small inline SVG icons ─────────────────────────────────────────────────────

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

// Small sidebar watermark (used in sidebar footers)
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

// ── Large background longship ──────────────────────────────────────────────────
// Full-bleed watermark behind portal page content. Faded brand teal.

export function LongshipBackground() {
  const C = "#0D7377"; // brand teal
  const shields = [145, 220, 295, 375, 455, 535, 615, 695, 770];
  const oars    = [150, 230, 310, 390, 470, 550, 630, 710, 790];

  return (
    <svg
      viewBox="0 0 940 400"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ opacity: 1 }}
    >
      {/* ── Hull body ── */}
      <path
        d="M80,245
           Q450,278 855,245
           L870,215
           Q895,195 908,162
           Q918,125 898,96
           Q878,66 852,70
           Q828,74 830,102
           Q832,128 850,150
           L833,178
           Q450,162 112,178
           L88,172
           Q64,158 67,132
           Q70,110 84,122
           L84,175
           Q62,208 80,245 Z"
        fill={C} fillOpacity="0.045"
      />

      {/* ── Keel (bottom of hull) ── */}
      <path
        d="M84,248 Q470,278 854,248"
        stroke={C} strokeOpacity="0.07" strokeWidth="2.5" fill="none"
      />

      {/* ── Top rail (gunwale) ── */}
      <path
        d="M88,174 Q470,160 832,174"
        stroke={C} strokeOpacity="0.06" strokeWidth="1.5" fill="none"
      />

      {/* ── Dragon prow (right) ── */}
      {/* Neck */}
      <path
        d="M833,178 Q870,178 896,162 Q918,145 910,120 Q902,96 882,88 Q864,80 854,92 Q845,104 855,118 Q862,130 858,145 L848,160"
        fill="none"
        stroke={C} strokeOpacity="0.07" strokeWidth="1.5"
      />
      {/* Dragon head */}
      <path
        d="M882,88 Q902,72 918,80 Q930,90 920,104 Q910,116 896,112 Q882,108 878,96 Z"
        fill={C} fillOpacity="0.06"
      />
      {/* Nostril */}
      <circle cx="916" cy="90" r="3" fill={C} fillOpacity="0.07" />
      {/* Eye */}
      <circle cx="904" cy="84" r="4" fill={C} fillOpacity="0.05" stroke={C} strokeOpacity="0.08" strokeWidth="1" />
      {/* Horn */}
      <path d="M898,72 Q906,56 914,62" stroke={C} strokeOpacity="0.06" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* ── Stern post (left) ── */}
      <path
        d="M84,175 Q64,162 60,138 Q57,116 70,110 Q80,106 84,124"
        stroke={C} strokeOpacity="0.065" strokeWidth="2.5" fill="none" strokeLinecap="round"
      />
      <path
        d="M60,130 Q52,110 62,96 Q70,84 80,90"
        stroke={C} strokeOpacity="0.05" strokeWidth="2" fill="none" strokeLinecap="round"
      />

      {/* ── Mast ── */}
      <line x1="420" y1="52" x2="420" y2="242" stroke={C} strokeOpacity="0.08" strokeWidth="4" strokeLinecap="round" />
      {/* Horizontal yard/boom at top */}
      <line x1="282" y1="52" x2="558" y2="52" stroke={C} strokeOpacity="0.07" strokeWidth="2.5" strokeLinecap="round" />

      {/* ── Sail ── */}
      <path
        d="M286,54 Q420,44 556,54 L556,188 Q420,198 286,188 Z"
        fill={C} fillOpacity="0.04"
      />
      {/* Sail horizontal stripes */}
      <line x1="286" y1="90"  x2="556" y2="90"  stroke={C} strokeOpacity="0.04" strokeWidth="1" />
      <line x1="286" y1="121" x2="556" y2="121" stroke={C} strokeOpacity="0.04" strokeWidth="1" />
      <line x1="286" y1="152" x2="556" y2="152" stroke={C} strokeOpacity="0.04" strokeWidth="1" />
      {/* Sail outline */}
      <path
        d="M286,54 Q420,44 556,54 L556,188 Q420,198 286,188 Z"
        fill="none" stroke={C} strokeOpacity="0.055" strokeWidth="1.5"
      />
      {/* Diagonal bracing ropes on sail */}
      <line x1="286" y1="54" x2="556" y2="188" stroke={C} strokeOpacity="0.03" strokeWidth="1" />
      <line x1="556" y1="54" x2="286" y2="188" stroke={C} strokeOpacity="0.03" strokeWidth="1" />

      {/* ── Rigging ropes mast→bow & mast→stern ── */}
      <line x1="420" y1="52" x2="840" y2="174" stroke={C} strokeOpacity="0.045" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="420" y1="52" x2="88"  y2="174" stroke={C} strokeOpacity="0.045" strokeWidth="1.5" strokeLinecap="round" />
      {/* Stay lines from boom ends */}
      <line x1="282" y1="52" x2="90"  y2="174" stroke={C} strokeOpacity="0.03" strokeWidth="1" />
      <line x1="558" y1="52" x2="840" y2="174" stroke={C} strokeOpacity="0.03" strokeWidth="1" />

      {/* ── Shields along the rail ── */}
      {shields.map((x, i) => (
        <g key={i} transform={`translate(${x},174)`} aria-hidden="true">
          <circle r="16" fill={C} fillOpacity="0.035" stroke={C} strokeOpacity="0.06" strokeWidth="1.5" />
          <circle r="5"  fill={C} fillOpacity="0.055" />
          <line x1="-16" y1="0" x2="16" y2="0" stroke={C} strokeOpacity="0.04" strokeWidth="1" />
          <line x1="0" y1="-16" x2="0" y2="16" stroke={C} strokeOpacity="0.04" strokeWidth="1" />
        </g>
      ))}

      {/* ── Oars below waterline ── */}
      {oars.map((x, i) => (
        <line
          key={i}
          x1={x} y1={248} x2={x - 30} y2={294}
          stroke={C} strokeOpacity="0.045" strokeWidth="2.5" strokeLinecap="round"
        />
      ))}

      {/* ── Water waves ── */}
      <path
        d="M20,316 Q55,300 90,316 Q125,332 160,316 Q195,300 230,316 Q265,332 300,316 Q335,300 370,316 Q405,332 440,316 Q475,300 510,316 Q545,332 580,316 Q615,300 650,316 Q685,332 720,316 Q755,300 790,316 Q825,332 860,316 Q895,300 930,316"
        stroke={C} strokeOpacity="0.05" strokeWidth="2.5" fill="none" strokeLinecap="round"
      />
      <path
        d="M20,338 Q55,322 90,338 Q125,354 160,338 Q195,322 230,338 Q265,354 300,338 Q335,322 370,338 Q405,354 440,338 Q475,322 510,338 Q545,354 580,338 Q615,322 650,338 Q685,354 720,338 Q755,322 790,338 Q825,354 860,338 Q895,322 930,338"
        stroke={C} strokeOpacity="0.035" strokeWidth="2" fill="none" strokeLinecap="round"
      />
      <path
        d="M20,358 Q55,344 90,358 Q125,372 160,358 Q195,344 230,358 Q265,372 300,358 Q335,344 370,358 Q405,372 440,358 Q475,344 510,358 Q545,372 580,358 Q615,344 650,358 Q685,372 720,358 Q755,344 790,358 Q825,372 860,358 Q895,344 930,358"
        stroke={C} strokeOpacity="0.025" strokeWidth="1.5" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

// ── Page-specific Viking characters ───────────────────────────────────────────
// Reads the current URL and picks the right Viking PNG + flavour caption.

type VikingConfig = { img: string; caption: string };

const PAGE_VIKINGS: Record<string, VikingConfig> = {
  // Employee portal
  "dashboard":    { img: vikingProudPath,   caption: "Ready to raid the backlog!" },
  "time":         { img: vikingCodingPath,  caption: "Counting every battle-minute…" },
  "kanban":       { img: vikingCodingPath,  caption: "Moving tasks to Valhalla!" },
  "expenses":     { img: vikingLostPath,    caption: "Where did the gold go?!" },
  "tickets":      { img: vikingWavePath,    caption: "Hailing the troubled client!" },
  "lms":          { img: vikingCodingPath,  caption: "Knowledge is true power!" },
  "chat":         { img: vikingWavePath,    caption: "Hailing the crew!" },
  "users":        { img: vikingShieldPath,  caption: "Guarding the roster!" },
  // Board portal
  "calendar":     { img: vikingWavePath,    caption: "Plotting the next raid…" },
  "meetings":     { img: vikingProudPath,   caption: "To the great hall!" },
  "scheduling":   { img: vikingLostPath,    caption: "Finding common ground…" },
  "documents":    { img: vikingShieldPath,  caption: "Sacred scrolls, protected." },
  "minutes":      { img: vikingCodingPath,  caption: "Recording the sagas…" },
  "action-items": { img: vikingTriumphPath, caption: "Victory awaits!" },
  "consents":     { img: vikingShieldPath,  caption: "The runes must be signed." },
  "conflicts":    { img: vikingLostPath,    caption: "Navigating troubled waters…" },
  "directory":    { img: vikingWavePath,    caption: "Know thy kin!" },
  "financials":   { img: vikingLostPath,    caption: "Tallying the plunder…" },
  "forums":       { img: vikingTriumphPath, caption: "Speak, warrior!" },
  "onboarding":   { img: vikingCodingPath,  caption: "Learn the old ways!" },
  "settings":     { img: vikingCodingPath,  caption: "Adjusting the sails…" },
  "profile":      { img: vikingProudPath,   caption: "Your saga, your glory." },
  "roster":       { img: vikingShieldPath,  caption: "Protect the clan!" },
  "members":      { img: vikingProudPath,   caption: "The great council." },
  "conflicts-of-interest": { img: vikingLostPath, caption: "Navigating troubled waters…" },
};

export function PageViking() {
  const [location] = useLocation();
  const segment = location.split("/").filter(Boolean).pop() ?? "dashboard";
  const config: VikingConfig = PAGE_VIKINGS[segment] ?? { img: vikingProudPath, caption: "Onward!" };

  return (
    <div
      className="fixed bottom-4 right-4 z-20 flex flex-col items-center pointer-events-none select-none"
      aria-hidden="true"
    >
      <div className="bg-white/85 backdrop-blur-sm rounded-2xl px-3 py-1.5 text-[11px] text-slate-500 italic shadow-md mb-2 max-w-[160px] text-center leading-snug border border-slate-100">
        {config.caption}
      </div>
      <img
        src={config.img}
        alt=""
        className="h-32 w-auto drop-shadow-xl"
        style={{ opacity: 0.82 }}
      />
    </div>
  );
}

// ── Decorative row of small weapons/armor ─────────────────────────────────────

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

// ── Daily rotating mottos ─────────────────────────────────────────────────────

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
