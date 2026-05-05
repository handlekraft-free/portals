import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Lock, Check } from "lucide-react";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useXp } from "./XpProvider";
import {
  AvatarRenderer, unlocksForXp,
  HELM_OPTIONS, CLOAK_OPTIONS, BEARD_OPTIONS, EMBLEM_OPTIONS,
  type AvatarConfig, type HelmOpt, type CloakOpt, type BeardOpt, type EmblemOpt,
} from "./AvatarRenderer";

interface Props {
  isOpen: boolean;
  initials: string;
  initialConfig: AvatarConfig | null;
  onClose: () => void;
  onSaved: (config: AvatarConfig) => void;
}

const UNLOCK_HINT: Record<string, { layer: string; rank: string }> = {
  helm:   { layer: "Helm",   rank: "Karl"    },
  beard:  { layer: "Beard",  rank: "Jarl"    },
  cloak:  { layer: "Cloak",  rank: "Hersir"  },
  emblem: { layer: "Emblem", rank: "Konungr" },
};

export function AvatarCustomizer({ isOpen, initials, initialConfig, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const { progress } = useXp();
  const xp = progress?.xp ?? 0;
  const unlock = unlocksForXp(xp);

  const [config, setConfig] = useState<AvatarConfig>({
    helm:   initialConfig?.helm   ?? "none",
    cloak:  initialConfig?.cloak  ?? "none",
    beard:  initialConfig?.beard  ?? "none",
    emblem: initialConfig?.emblem ?? "none",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig({
        helm:   initialConfig?.helm   ?? "none",
        cloak:  initialConfig?.cloak  ?? "none",
        beard:  initialConfig?.beard  ?? "none",
        emblem: initialConfig?.emblem ?? "none",
      });
    }
  }, [isOpen, initialConfig]);

  async function save() {
    setSaving(true);
    const res = await apiRequest("PATCH", "/api/auth/avatar", config);
    if (res?.success) {
      // Broadcast so every surface that renders the avatar (sidebar, hero
      // card, settings card) updates in-session without needing a reload.
      const saved = (res.data?.avatarConfig ?? config) as AvatarConfig;
      window.dispatchEvent(
        new CustomEvent("hk:avatar-changed", { detail: { config: saved } }),
      );
    }
    setSaving(false);
    if (res?.success) {
      toast({ title: "Avatar saved" });
      onSaved((res.data?.avatarConfig ?? config) as AvatarConfig);
      onClose();
    } else {
      toast({ title: "Could not save avatar", variant: "destructive" });
    }
  }

  // Honor `prefers-reduced-motion`: render instantly with no transforms/fades.
  // Must be called before any early return so hook order stays stable.
  const reduce = useReducedMotion();

  if (!isOpen) return null;

  const fade = reduce
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const pop = reduce
    ? { initial: false as const, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 1, opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { scale: 0.94, opacity: 0, y: 10 },
        animate: { scale: 1, opacity: 1, y: 0 },
        exit: { scale: 0.94, opacity: 0, y: 10 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" data-testid="modal-avatar-customizer">
        <motion.div
          {...fade}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          {...pop}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377] px-6 pt-5 pb-4 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10"
              data-testid="button-close-avatar-customizer"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-white/45 text-[10px] font-semibold uppercase tracking-widest mb-1">Customize</p>
            <h2 className="text-white font-display text-xl">Forge your hero</h2>
            <p className="text-white/55 text-sm mt-0.5">Cosmetic only — unlocks earned by rank.</p>
          </div>

          <div className="px-6 py-5 grid grid-cols-[auto_1fr] gap-5 items-start">
            {/* Live preview */}
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-2xl bg-slate-50 p-3">
                <AvatarRenderer initials={initials} config={config} size={96} />
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Preview</p>
            </div>

            {/* Layer pickers */}
            <div className="space-y-3">
              {/* Type parameter is inferred from `options` (a `readonly T[]`),
                  so `value` and `onChange` stay aligned per layer without
                  the inline JSX generic syntax that conflicts with the
                  replit-metadata babel plugin. */}
              <LayerRow
                label="Helm"
                options={HELM_OPTIONS}
                value={(config.helm ?? "none") as HelmOpt}
                locked={!unlock.helm}
                onChange={(v) => setConfig((c) => ({ ...c, helm: v }))}
              />
              <LayerRow
                label="Beard"
                options={BEARD_OPTIONS}
                value={(config.beard ?? "none") as BeardOpt}
                locked={!unlock.beard}
                onChange={(v) => setConfig((c) => ({ ...c, beard: v }))}
              />
              <LayerRow
                label="Cloak"
                options={CLOAK_OPTIONS}
                value={(config.cloak ?? "none") as CloakOpt}
                locked={!unlock.cloak}
                onChange={(v) => setConfig((c) => ({ ...c, cloak: v }))}
              />
              <LayerRow
                label="Emblem"
                options={EMBLEM_OPTIONS}
                value={(config.emblem ?? "none") as EmblemOpt}
                locked={!unlock.emblem}
                onChange={(v) => setConfig((c) => ({ ...c, emblem: v }))}
              />
            </div>
          </div>

          <div className="px-6 pb-5 pt-2 flex items-center justify-between border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              Locked? Earn the rank — <span className="text-slate-600">Karl → Jarl → Hersir → Konungr</span>.
            </p>
            <button
              onClick={save}
              disabled={saving}
              className="bg-[#D4A843] hover:bg-[#c49535] text-[#1A1F2B] font-semibold rounded-xl px-5 py-2 text-sm flex items-center gap-1.5 disabled:opacity-60"
              data-testid="button-save-avatar"
            >
              <Check className="w-4 h-4" /> Save
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Generic over the option string-literal union for whichever layer is being
// rendered (helm/beard/cloak/emblem). Avoids `as unknown as string[]` casts
// at call sites and keeps `value` / `onChange` aligned with each layer.
function LayerRow<T extends string>({
  label, options, value, locked, onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  locked: boolean;
  onChange: (v: T) => void;
}) {
  const hint = UNLOCK_HINT[label.toLowerCase()];
  return (
    <div data-testid={`row-avatar-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {locked && hint && (
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Unlocks at {hint.rank}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={locked && opt !== "none"}
              onClick={() => onChange(opt)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                selected
                  ? "border-[#0D7377] bg-teal-50 text-[#0D7377]"
                  : locked && opt !== "none"
                    ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              data-testid={`option-${label.toLowerCase()}-${opt}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
